import Stripe from "stripe";
import { config } from "../config";

let client: Stripe | null = null;
export function stripeClient(): Stripe {
  if (!config.stripe.secretKey) throw new Error("Stripe is not configured");
  client ??= new Stripe(config.stripe.secretKey);
  return client;
}

export async function createCheckoutSession(params: {
  paymentId: string;
  amountPaise: number;
  currency: string;
  description: string;
  customerEmail: string;
  businessId: string;
}) {
  const session = await stripeClient().checkout.sessions.create({
    mode: "payment",
    customer_email: params.customerEmail,
    client_reference_id: params.paymentId,
    metadata: { paymentId: params.paymentId, businessId: params.businessId },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: params.amountPaise,
          product_data: { name: params.description },
        },
      },
    ],
    success_url: `${config.appUrl}/payments/return?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.appUrl}/dashboard/${params.businessId}?payment=cancelled`,
  });
  if (!session.url) throw new Error("Stripe session has no URL");
  return { id: session.id, url: session.url };
}

export async function retrieveSession(sessionId: string) {
  return stripeClient().checkout.sessions.retrieve(sessionId);
}

export function constructWebhookEvent(rawBody: string, signature: string) {
  return stripeClient().webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}
