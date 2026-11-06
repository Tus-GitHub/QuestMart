export const ORDER_STATUSES = {
  pending: {
    label: "Payment pending",
    tone: "amber",
    description: "This order is waiting for a payment confirmation.",
  },
  confirmed: {
    label: "Confirmed",
    tone: "lime",
    description: "Payment is confirmed. Your order is with the seller.",
  },
  completed: {
    label: "Completed",
    tone: "violet",
    description: "This order has been marked complete.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "neutral",
    description: "This order was cancelled. See its payment status below.",
  },
};

export function orderStatus(order) {
  return (
    ORDER_STATUSES[order.status] || {
      label: "Status unavailable",
      tone: "neutral",
      description: "The order status is currently unavailable.",
    }
  );
}

export function filterOrders(
  orders,
  { scope = "all", status = "all", query = "" },
  userId,
) {
  const term = query.trim().toLowerCase();
  return orders.filter((order) => {
    if (scope === "purchases" && order.buyer_id !== userId) return false;
    if (scope === "sales" && order.seller_id !== userId) return false;
    if (status !== "all" && order.status !== status) return false;
    return (
      !term ||
      [
        order.snapshot_title,
        order.snapshot_platform,
        order.id,
        order.buyer_id === userId ? order.seller_name : order.buyer_name,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      )
    );
  });
}

export function orderDate(value, detailed = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
    ...(detailed ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}
