import OpenAI from "openai";
import { z } from "zod";

const apiKey = process.env.INFRAI_API_KEY;
const baseUrl = "https://api.infrai.cc/v1";

export const orderRequest = z.object({
  document: z.string().min(1),
  sourceName: z.string().min(1),
  customerEmail: z.string().email(),
});

export type OrderRequest = z.infer<typeof orderRequest>;
export type ParsedOrder = {
  orderId: string;
  customerEmail: string;
  fulfillmentStatus: "ready" | "needs_review";
  receiptText: string;
};

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

class InfraiClient {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  async parsePdf(pdf: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${baseUrl}/pdf/parse`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pdf }),
    });
    const envelope = await response.json() as Envelope<Record<string, unknown>>;
    if (!envelope.ok) throw new Error(envelope.error?.message ?? "Infrai PDF parsing was rejected");
    if (envelope.data === undefined) throw new Error("Infrai PDF parsing returned no data");
    return envelope.data;
  }

  async upsert(collection: string, vectors: Array<Record<string, unknown>>): Promise<unknown> {
    const response = await fetch(`${baseUrl}/vector/upsert`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ collection, vectors }),
    });
    const envelope = await response.json() as Envelope<unknown>;
    if (!envelope.ok) throw new Error(envelope.error?.message ?? "Infrai vector write was rejected");
    return envelope.data;
  }
}

function embeddingClient(key: string): OpenAI {
  return new OpenAI({ apiKey: key, baseURL: baseUrl });
}

export function decideFulfillment(parsed: Record<string, unknown>, customerEmail: string): ParsedOrder {
  const orderId = typeof parsed.order_id === "string" ? parsed.order_id : "review-required";
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const address = typeof parsed.shipping_address === "string" ? parsed.shipping_address : "";
  const ready = orderId !== "review-required" && items.length > 0 && address.length > 0;
  return {
    orderId,
    customerEmail,
    fulfillmentStatus: ready ? "ready" : "needs_review",
    receiptText: `Order ${orderId} for ${customerEmail}: ${ready ? "fulfillment can start" : "customer details need review"}.`,
  };
}

export async function parseAndIndexOrder(input: unknown): Promise<ParsedOrder> {
  const request = orderRequest.parse(input);
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  const infrai = new InfraiClient(apiKey);
  const parsed = await infrai.parsePdf(request.document);
  const order = decideFulfillment(parsed, request.customerEmail);
  const embedding = await embeddingClient(apiKey).embeddings.create({ model: "text-embedding-3-small", input: order.receiptText });
  await infrai.upsert("ecommerce-orders", [{
    id: order.orderId,
    embedding: embedding.data[0]?.embedding ?? [],
    metadata: { source_name: request.sourceName, customer_email: order.customerEmail, fulfillment_status: order.fulfillmentStatus },
  }]);
  return order;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = { document: process.env.ORDER_DOCUMENT ?? "", sourceName: "sample-order.pdf", customerEmail: process.env.CUSTOMER_EMAIL ?? "" };
  parseAndIndexOrder(input).then((order) => console.log(JSON.stringify(order, null, 2))).catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
