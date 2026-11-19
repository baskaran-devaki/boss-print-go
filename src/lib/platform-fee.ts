// Merchant's online-order fee, independent of Razorpay's own merchant pricing.
export const PLATFORM_FEE_BPS = 250; // 2.5%; fixed on the server, never supplied by the customer.
export function calculateOrderTotal(subtotalAmount: number, feeBps = PLATFORM_FEE_BPS) {
  const subtotalPaise = Math.round(subtotalAmount * 100);
  if (!Number.isFinite(subtotalAmount) || subtotalAmount < 0 || !Number.isSafeInteger(subtotalPaise) || !Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000 || !Number.isSafeInteger(subtotalPaise * feeBps)) {
    throw new Error("Invalid order amount");
  }
  const feePaise = Math.round(subtotalPaise * feeBps / 10000);
  return {
    subtotalAmount: subtotalPaise / 100,
    platformFeeAmount: feePaise / 100,
    platformFeeRateBps: feeBps,
    totalAmount: (subtotalPaise + feePaise) / 100,
  };
}
// Read historical snapshots; never apply today's rate to an existing payment/order.
export function storedOrderAmounts(order: { total_amount: unknown; subtotal_amount?: unknown; platform_fee_amount?: unknown; platform_fee_rate_bps?: unknown }) {
  const totalAmount = Number(order.total_amount);
  const platformFeeAmount = Number(order.platform_fee_amount ?? 0);
  return {
    totalAmount,
    subtotalAmount: Number(order.subtotal_amount ?? (totalAmount - platformFeeAmount)),
    platformFeeAmount,
    platformFeeRateBps: Number(order.platform_fee_rate_bps ?? 0),
  };
}
