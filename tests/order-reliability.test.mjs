import assert from "node:assert/strict";
import test from "node:test";
import { parseAdminOrderQuery } from "../src/lib/admin-order-query.ts";
import { orderStatusSchema } from "../src/lib/validation.ts";

test("parses search, pagination, filters, and Nairobi calendar-day boundaries", () => {
  const result = parseAdminOrderQuery(new URLSearchParams({
    search: "  PDF-123  ",
    status: "CONFIRMED",
    paymentStatus: "PARTIAL",
    from: "2026-11-07",
    to: "2026-11-08",
    page: "2",
    pageSize: "50",
  }));

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.search, "PDF-123");
  assert.equal(result.data.page, 2);
  assert.equal(result.data.status, "CONFIRMED");
  assert.equal(result.data.paymentStatus, "PARTIAL");
  assert.equal(result.data.from?.toISOString(), "2026-11-06T21:00:00.000Z");
  assert.equal(result.data.to?.toISOString(), "2026-11-08T20:59:59.999Z");
});

test("rejects invalid dates, reversed ranges, and out-of-range pagination", () => {
  for (const query of [
    new URLSearchParams({ from: "2026-02-30" }),
    new URLSearchParams({ from: "2026-11-08", to: "2026-11-07" }),
    new URLSearchParams({ page: "0" }),
    new URLSearchParams({ pageSize: "51" }),
  ]) {
    assert.equal(parseAdminOrderQuery(query).success, false);
  }
});

test("requires a reason to cancel and accepts a valid cancellation", () => {
  assert.equal(orderStatusSchema.safeParse({ orderStatus: "CANCELLED" }).success, false);
  assert.equal(orderStatusSchema.safeParse({
    orderStatus: "CANCELLED",
    cancellationReason: "Customer requested cancellation",
  }).success, true);
  assert.equal(orderStatusSchema.safeParse({ orderStatus: "CONFIRMED" }).success, true);
});
