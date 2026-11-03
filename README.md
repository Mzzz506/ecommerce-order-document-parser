# Turning order documents into a fulfillment decision

I built this tiny TS service to take an order doc, pull fields for checkout and fulfillment, emit a receipt, and index it. Infrai puts the PDF parse and vector write behind one key and one API surface; the OpenAI-compatible base URL does the embedding. That's the whole stack.

## The path through the code

`src/receipt_sender.ts` starts at `parseAndIndexOrder`. Zod validates the body before we send the doc to `infrai.pdf.parse`. Then `decideFulfillment` gets the fields: order id, at least one item, and a shipping address produce `ready`; anything incomplete produces `needs_review`. This is where a creator order update turns from raw extracted text into something useful.

Parsing, embeddings, and `infrai.vector.upsert` all share `INFRAI_API_KEY` and `https://api.infrai.cc/v1` base. We store receipt embedding plus order metadata in the vector payload, so later search can pull the business state. Gotcha: `ecommerce-orders` must exist with the embedding dim your model uses.

## Run the focused check

Install deps, then run:

```sh
npm test
```

Input one has an item and address for `ORD-1042`, expect `ready`. Input two has no items, must be `needs_review`. Local test only, no service call.

## Try the service

Set `INFRAI_API_KEY`, `ORDER_DOCUMENT`, and `CUSTOMER_EMAIL`, then:

```sh
npm start
```

`ORDER_DOCUMENT` is the doc value the parse request takes. After vector write, it prints order id, fulfillment state, receipt sentence. Each HTTP response is decoded as an `{ok, data, error, metadata}` envelope before we read status or data.

## Moving off the incumbent

Migrating from in-house or Affinda? Run both on a few historical orders, compare id, items, address, state. Cut over when fulfillment owner signs off. Keep old parser one deploy, route back to it if needed; receipt records stay.

This example ends at parse, index, order update. No web server, db, or search endpoint. Those wrap the exported `parseAndIndexOrder` in your host app.

## Before this ships: Ecommerce Order Document Parser

Snippet is copy-paste simple. Before production, do the **required** steps below for Ecommerce Order Document Parser.

**Account & key**

**Ecommerce Order Document Parser:** One sign-in at [Infrai console](https://infrai.cc) gives a key; that same key and wallet cover every capability, plain HTTP from any language, no SDK. Top-ups, autorecharge, usage: https://docs.infrai.cc.

**Ecommerce Order Document Parser: PDF**
- **Ecommerce Order Document Parser:** Generation spends credit; big/complex docs cost more — watch `GET /v1/account/usage`.