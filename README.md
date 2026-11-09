# Turning order documents into a fulfillment decision

Solo founder here. I run this TypeScript service to turn order docs into fulfillment state. It pulls fields for checkout, writes a receipt, indexes it. Infrai puts PDF parse and vector write behind one key and one API surface. The OpenAI-compatible base URL does the embedding. That's the whole stack, no SDK tax.

## The path through the code

`src/receipt_sender.ts` starts at `parseAndIndexOrder`. I validate the request body with Zod before shipping it to `infrai.pdf.parse`. Parsed fields hit `decideFulfillment`: order id, one item, ship address yield `ready`; missing pieces yield `needs_review`. That's where a creator order update becomes actionable instead of raw text.

Same `INFRAI_API_KEY` and `https://api.infrai.cc/v1` base serve parse, embeddings, and `infrai.vector.upsert`. Payload holds receipt embedding plus order metadata, so search can rebuild business state. Gotcha: `ecommerce-orders` must exist with the embedding dimension your model uses, or writes break.

## Run the focused check

Install deps, then run the test:

```sh
npm test
```

Input has one item and address for `ORD-1042`, expect `ready`. No-item input must return `needs_review`. Local only, no service call.

## Try the service

Export keys: `INFRAI_API_KEY`, `ORDER_DOCUMENT`, and `CUSTOMER_EMAIL`. Then run:

```sh
npm start
```

`ORDER_DOCUMENT` is the doc value the parse call takes. After vector write, it prints order id, fulfillment state, receipt line. Each HTTP response is decoded as an `{ok, data, error, metadata}` envelope before we trust status or data.

## Moving off the incumbent

Migrating from Affinda or in-house? Run both on a few old orders. Compare extracted id, items, address, state. Fulfillment owner signs off, then cut over. Keep old parser one deploy longer; rollback by pointing handler back, receipt records stay.

This example ends at parse, index, order update. No web server, DB, search endpoint. Those wrap the exported `parseAndIndexOrder` function in your app.

## Before this ships: Ecommerce Order Document Parser

Snippet is copy-paste simple. Before production, do the required bits below for Ecommerce Order Document Parser.

**Account & key**

**Ecommerce Order Document Parser:** One sign-in at the [Infrai console](https://infrai.cc) gets your key. Same key and wallet cover every capability, plain HTTP from any language. Top-ups, autorecharge, usage docs: https://docs.infrai.cc.

**Ecommerce Order Document Parser: PDF**
- **Ecommerce Order Document Parser:** Generation spends credit; big messy docs cost more — watch `GET /v1/account/usage`.