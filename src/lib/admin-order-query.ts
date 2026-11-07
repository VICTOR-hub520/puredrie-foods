const orderStatuses = new Set([
  "NEW",
  "CONFIRMED",
  "BEING_PACKED",
  "READY_FOR_DISPATCH",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);
const paymentStatuses = new Set(["PENDING", "PARTIAL", "PAID", "FAILED", "REFUNDED"]);

type ParsedOrderQuery = {
  page: number;
  pageSize: number;
  search: string;
  status?: string;
  paymentStatus?: string;
  from?: Date;
  to?: Date;
};

type OrderQueryResult =
  | { success: true; data: ParsedOrderQuery }
  | { success: false; error: string };

function isCalendarDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

export function parseAdminOrderQuery(params: URLSearchParams): OrderQueryResult {
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "25");
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const search = params.get("search")?.trim() ?? "";

  if (
    (from && !isCalendarDate(from)) ||
    (to && !isCalendarDate(to)) ||
    (from && to && from > to) ||
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 50 ||
    search.length > 120
  ) {
    return { success: false, error: "Enter valid order filters." };
  }

  return {
    success: true,
    data: {
      page,
      pageSize,
      search,
      ...(orderStatuses.has(params.get("status") ?? "")
        ? { status: params.get("status")! }
        : {}),
      ...(paymentStatuses.has(params.get("paymentStatus") ?? "")
        ? { paymentStatus: params.get("paymentStatus")! }
        : {}),
      ...(from ? { from: new Date(`${from}T00:00:00+03:00`) } : {}),
      ...(to ? { to: new Date(`${to}T23:59:59.999+03:00`) } : {}),
    },
  };
}
