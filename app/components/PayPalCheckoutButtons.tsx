"use client";

import {
  PayPalButtons,
  PayPalScriptProvider,
  type ReactPayPalScriptOptions,
} from "@paypal/react-paypal-js";
import { toast } from "sonner";

type PayPalCartProduct = {
  slug: string;
  name: string;
  price: string;
  image: string;
  quantity: number;
};

type PayPalOrderPayload = {
  firstName: string;
  lastName: string;
  streetAddress: string;
  country: string;
  stateProvince: string;
  city: string;
  zipPostalCode: string;
  phoneNumber: string;
  address: string;
  shippingFee: number;
  products: PayPalCartProduct[];
};

type PayPalCheckoutButtonsProps = {
  disabled?: boolean;
  refreshKey?: string | number;
  getOrderPayload: () => PayPalOrderPayload | null;
  onBeforePay?: () => boolean;
  onPaid: () => void;
  orderFailedMessage: string;
};

const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim() ?? "";

const scriptOptions: ReactPayPalScriptOptions = {
  clientId: paypalClientId,
  currency: "EUR",
  intent: "capture",
  components: "buttons",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

async function readApiError(response: Response, fallback: string) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json()) as { error?: string; ok?: boolean };
    return data.error?.trim() || fallback;
  }

  const text = await response.text();

  if (response.status === 503 || text.includes("503 Response Code")) {
    return "PayPal is temporarily unavailable (503). Please try again in a few minutes.";
  }

  if (response.status === 401) {
    return "Please sign in again to continue with PayPal.";
  }

  return fallback;
}

export default function PayPalCheckoutButtons({
  disabled = false,
  refreshKey,
  getOrderPayload,
  onBeforePay,
  onPaid,
  orderFailedMessage,
}: PayPalCheckoutButtonsProps) {
  if (!paypalClientId) {
    return (
      <p className="mt-6 text-center text-sm font-medium text-red-600">
        PayPal is not configured.
      </p>
    );
  }

  return (
    <div className="mt-6 min-h-[48px]">
      <PayPalScriptProvider options={scriptOptions}>
        <PayPalButtons
          style={{
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "paypal",
            height: 48,
          }}
          disabled={disabled}
          forceReRender={[disabled, refreshKey]}
          onClick={(_data, actions) => {
            if (onBeforePay && !onBeforePay()) {
              // Parent already shows address/auth feedback.
              return actions.reject();
            }

            return actions.resolve();
          }}
          createOrder={async () => {
            const payload = getOrderPayload();
            if (!payload) {
              throw new Error(orderFailedMessage);
            }

            const response = await fetch("/api/paypal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              throw new Error(await readApiError(response, orderFailedMessage));
            }

            const data = (await response.json()) as {
              ok?: boolean;
              orderId?: string;
              error?: string;
            };

            if (!data.ok || !data.orderId) {
              throw new Error(data.error ?? orderFailedMessage);
            }

            return data.orderId;
          }}
          onApprove={async (data) => {
            try {
              const payload = getOrderPayload();
              if (!payload || !data.orderID) {
                throw new Error(orderFailedMessage);
              }

              const response = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: data.orderID,
                  ...payload,
                }),
              });

              if (!response.ok) {
                throw new Error(
                  await readApiError(response, orderFailedMessage),
                );
              }

              const result = (await response.json()) as {
                ok?: boolean;
                error?: string;
              };

              if (!result.ok) {
                throw new Error(result.error ?? orderFailedMessage);
              }

              onPaid();
            } catch (error) {
              toast.error(getErrorMessage(error, orderFailedMessage));
              throw error;
            }
          }}
          onError={(error) => {
            // eslint-disable-next-line no-console
            console.error("[PayPalButtons]", error);
            toast.error(getErrorMessage(error, orderFailedMessage));
          }}
          onCancel={() => {
            // User closed the PayPal window — no toast needed.
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}
