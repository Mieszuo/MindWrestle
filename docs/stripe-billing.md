# Stripe Billing Setup

MindWrestle currently uses one-time attempt packages only. Subscriptions are intentionally not enabled.

## Products and Prices

Create three one-time products in Stripe Dashboard:

- `5 podejsc` -> copy its Price ID to `STRIPE_PRICE_ATTEMPTS_5`
- `15 podejsc` -> copy its Price ID to `STRIPE_PRICE_ATTEMPTS_15`
- `40 podejsc` -> copy its Price ID to `STRIPE_PRICE_ATTEMPTS_40`

## Environment

Set these variables in production:

```env
NEXT_PUBLIC_SITE_URL=https://www.mindwrestle.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ATTEMPTS_5=price_...
STRIPE_PRICE_ATTEMPTS_15=price_...
STRIPE_PRICE_ATTEMPTS_40=price_...
STRIPE_AUTOMATIC_TAX=false
FREE_ATTEMPTS_PER_MONTH=3
MAX_USER_MESSAGES_PER_ATTEMPT=25
```

Prefer a Stripe restricted API key (`rk_...`) over a full secret key when the required permissions are known. The key must be able to create Checkout Sessions and Customers and read Checkout Session line items.

Set `STRIPE_AUTOMATIC_TAX=true` only after configuring Stripe Tax registrations in Dashboard. It is safe to keep it disabled while tax obligations are not configured.

## Webhook

Create a webhook endpoint in Stripe:

```txt
https://www.mindwrestle.com/api/billing/webhook
```

Enable this event:

```txt
checkout.session.completed
```

The webhook idempotently credits the purchased attempt package. Replayed Stripe events are ignored by `stripe_event_id`, and duplicate fulfillment for the same Checkout Session is blocked by `checkout_session_id`.

The server verifies the paid package from the Checkout Session line item `price.id`; webhook metadata is not treated as the source of truth for the credited amount.

## Local Testing

For local development, use Stripe CLI forwarding:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Copy the printed `whsec_...` value to `STRIPE_WEBHOOK_SECRET`.
