const COMGATE_URL = "https://payments.comgate.cz/v1.0";

interface ComgateConfig {
  merchant: string;
  secret: string;
  test: boolean;
}

function getConfig(): ComgateConfig {
  return {
    merchant: process.env.COMGATE_MERCHANT || "",
    secret: process.env.COMGATE_SECRET || "",
    test: process.env.COMGATE_TEST === "true",
  };
}

interface CreatePaymentParams {
  price: number; // in haléře (smallest unit)
  refId: string;
  email: string;
  label?: string;
}

interface CreatePaymentResult {
  code: number;
  transId: string;
  redirect: string;
}

export async function createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const config = getConfig();
  const body = new URLSearchParams({
    merchant: config.merchant,
    secret: config.secret,
    price: String(params.price),
    curr: "CZK",
    label: params.label || `Objednávka ${params.refId}`,
    refId: params.refId,
    email: params.email,
    method: "ALL",
    prepareOnly: "true",
    test: config.test ? "true" : "false",
    lang: "cs",
    country: "CZ",
  });

  const res = await fetch(`${COMGATE_URL}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  const parsed = Object.fromEntries(new URLSearchParams(text));

  if (parsed.code !== "0") {
    throw new Error(`Comgate error: ${parsed.message}`);
  }

  return {
    code: 0,
    transId: parsed.transId,
    redirect: parsed.redirect,
  };
}

export interface PaymentStatus {
  status: "PENDING" | "PAID" | "CANCELLED" | "AUTHORIZED";
  price: number;
  refId: string;
  email: string;
}

export async function getPaymentStatus(transId: string): Promise<PaymentStatus> {
  const config = getConfig();
  const body = new URLSearchParams({
    merchant: config.merchant,
    secret: config.secret,
    transId,
  });

  const res = await fetch(`${COMGATE_URL}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  const parsed = Object.fromEntries(new URLSearchParams(text));

  if (parsed.code !== "0") {
    throw new Error(`Comgate status error: ${parsed.message}`);
  }

  return parsed as unknown as PaymentStatus;
}
