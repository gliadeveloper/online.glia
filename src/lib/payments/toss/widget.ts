export type WidgetCheckoutOptions =
  | { state: "off" }
  | { state: "unavailable"; message: string }
  | { state: "ready"; clientKey: string };

/** Fields the checkout sends to `widgets.requestPayment` after the server stores the order. */
export type TossWidgetPaymentRequest = {
  orderId: string;
  orderName: string;
  amount: { currency: "KRW"; value: number };
  successUrl: string;
  failUrl: string;
  customerEmail: string | null;
  customerName: string | null;
};
