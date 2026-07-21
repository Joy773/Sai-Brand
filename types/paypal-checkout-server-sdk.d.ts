declare module "@paypal/checkout-server-sdk" {
  class PayPalEnvironment {
    constructor(
      clientId: string,
      clientSecret: string,
      baseUrl: string,
      webUrl: string,
    );
    clientId: string;
    clientSecret: string;
    webUrl: string;
    authorizationString(): string;
  }

  class SandboxEnvironment extends PayPalEnvironment {
    constructor(clientId: string, clientSecret: string);
  }

  class LiveEnvironment extends PayPalEnvironment {
    constructor(clientId: string, clientSecret: string);
  }

  class PayPalHttpClient {
    constructor(environment: PayPalEnvironment, refreshToken?: string);
    execute<T = unknown>(request: unknown): Promise<{ result: T; statusCode: number }>;
  }

  class OrdersCreateRequest {
    prefer(preference: string): this;
    requestBody(body: Record<string, unknown>): this;
  }

  class OrdersCaptureRequest {
    constructor(orderId: string);
    prefer(preference: string): this;
    requestBody(body?: Record<string, unknown>): this;
  }

  class OrdersGetRequest {
    constructor(orderId: string);
  }

  const checkoutNodeJssdk: {
    core: {
      PayPalEnvironment: typeof PayPalEnvironment;
      SandboxEnvironment: typeof SandboxEnvironment;
      LiveEnvironment: typeof LiveEnvironment;
      PayPalHttpClient: typeof PayPalHttpClient;
    };
    orders: {
      OrdersCreateRequest: typeof OrdersCreateRequest;
      OrdersCaptureRequest: typeof OrdersCaptureRequest;
      OrdersGetRequest: typeof OrdersGetRequest;
    };
    payments: Record<string, unknown>;
  };

  export = checkoutNodeJssdk;
}
