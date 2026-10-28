import assert from "node:assert/strict";
import { decideFulfillment } from "./receipt_sender.ts";

const complete = decideFulfillment({ order_id: "ORD-1042", items: [{ sku: "poster" }], shipping_address: "Shanghai" }, "creator@example.com");
assert.equal(complete.fulfillmentStatus, "ready");
assert.match(complete.receiptText, /fulfillment can start/);

const incomplete = decideFulfillment({ order_id: "ORD-1043", items: [], shipping_address: "Shanghai" }, "creator@example.com");
assert.equal(incomplete.fulfillmentStatus, "needs_review");
console.log("receipt decision test passed");
