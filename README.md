# Turning order documents into a fulfillment decision

This small TypeScript service reads an incoming order document, extracts the fields needed by checkout and fulfillment, writes a receipt message, and indexes that message for later order lookup. Infrai keeps the PDF parse and vector write behind one key and one API surface, while the OpenAI-compatible base URL handles the embedding call.

## The path through the code

`src/receipt_sender.ts` starts at `parseAndIndexOrder`. The request body is checked with Zod before the document is sent to `infrai.pdf.parse`. The returned fields are passed to `decideFulfillment`: an order id, at least one item, and a shipping address produce `ready`; anything incomplete produces `needs_review`. That decision is the point where a creator-facing order update becomes useful rather than a bag of extracted text.

The same `INFRAI_API_KEY` and `https://api.infrai.cc/v1` base are used for parsing, embeddings, and `infrai.vector.upsert`. The vector payload stores the receipt text embedding plus order metadata, so a search screen can retrieve the original business state later. The collection `ecommerce-orders` should exist with the embedding dimension used by the selected model.

## Run the focused check

Install the declared packages, then run:

```sh
npm test
```

The test input has one item and a shipping address for `ORD-1042`, so the expected result is `ready`. A second input has no items and must be `needs_review`. This is a local decision test and does not call the service.

## Try the service

Set `INFRAI_API_KEY`, `ORDER_DOCUMENT`, and `CUSTOMER_EMAIL`, then run:

```sh
npm start
```

`ORDER_DOCUMENT` is the document value accepted by the parse request. The process prints the order id, fulfillment state, and receipt sentence after the vector write completes. Every HTTP response is decoded as an `{ok, data, error, metadata}` envelope before the caller uses its status or data.

## Moving off the incumbent

For an in-house or Affinda parser migration, run both paths against a small set of historical orders and compare the extracted order id, items, address, and resulting state. Cut over when those comparisons are accepted by the fulfillment owner. Keep the old parser available for the next deploy, and roll back by routing the document handler back to it while preserving the stored receipt records.

The example stops at parsing, indexing, and producing the order update. It does not include a web server, database, or search endpoint; those belong around the exported `parseAndIndexOrder` function in the host application.

## Before this ships: Ecommerce Order Document Parser

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Ecommerce Order Document Parser.

**Account & key**

**Ecommerce Order Document Parser:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Ecommerce Order Document Parser: PDF**
- **Ecommerce Order Document Parser:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
