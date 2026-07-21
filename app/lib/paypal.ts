import checkoutNodeJssdk from "@paypal/checkout-server-sdk";

type PayPalHttpClient = InstanceType<
  typeof checkoutNodeJssdk.core.PayPalHttpClient
>;

let paypalClient: PayPalHttpClient | null = null;
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be configured.",
    );
  }

  return { clientId, clientSecret };
}

export function getPayPalApiBaseUrl() {
  const mode = process.env.PAYPAL_MODE?.trim().toLowerCase();

  if (mode === "live" || mode === "production") {
    return "https://api-m.paypal.com";
  }

  return "https://api-m.sandbox.paypal.com";
}

function getPayPalEnvironment() {
  const { clientId, clientSecret } = getPayPalCredentials();
  const mode = process.env.PAYPAL_MODE?.trim().toLowerCase();

  if (mode === "live" || mode === "production") {
    return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
  }

  return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
}

export function getPayPalClient() {
  if (paypalClient) {
    return paypalClient;
  }

  paypalClient = new checkoutNodeJssdk.core.PayPalHttpClient(
    getPayPalEnvironment(),
  );

  return paypalClient;
}

export async function getPayPalAccessToken() {
  const now = Date.now();

  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 30_000) {
    return cachedAccessToken.token;
  }

  const { clientId, clientSecret } = getPayPalCredentials();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(`${getPayPalApiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Failed to obtain PayPal access token.",
    );
  }

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 300) * 1000,
  };

  return data.access_token;
}

export default getPayPalClient;
export { checkoutNodeJssdk as paypal };
