import crypto from "crypto";

export interface CertificatePayload {
  investorCode: string;
  investorName: string;
  fundCode: string;
  units: number;
  costPricePerUnit: number;
  totalValue: number;
  issueDate: string;
}

function getSecret(): string {
  const secret = process.env.CERTIFICATE_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "CERTIFICATE_HMAC_SECRET must be set (min 32 bytes). Generate with: openssl rand -base64 48",
    );
  }
  return secret;
}

function canonicalize(p: CertificatePayload): string {
  return [
    p.investorCode,
    p.investorName,
    p.fundCode,
    p.units,
    p.costPricePerUnit,
    p.totalValue,
    p.issueDate,
  ].join("|");
}

export function signCertificate(payload: CertificatePayload): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(canonicalize(payload))
    .digest("base64url");
}

export function verifyCertificate(
  payload: CertificatePayload,
  token: string,
): boolean {
  let expected: string;
  try {
    expected = signCertificate(payload);
  } catch {
    return false;
  }
  try {
    const a = Buffer.from(expected, "base64url");
    const b = Buffer.from(token, "base64url");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Encode the full payload in the URL so verification is stateless — the HMAC
// proves the tuple wasn't tampered with, no DB lookup required.
export function buildVerificationUrl(
  baseUrl: string,
  payload: CertificatePayload,
): string {
  const token = signCertificate(payload);
  const params = new URLSearchParams({
    code: payload.investorCode,
    name: payload.investorName,
    fund: payload.fundCode,
    units: String(payload.units),
    cost: String(payload.costPricePerUnit),
    total: String(payload.totalValue),
    date: payload.issueDate,
    token,
  });
  return `${baseUrl.replace(/\/$/, "")}/verify-certificate?${params.toString()}`;
}

export function parsePayloadFromParams(
  params: URLSearchParams,
): { payload: CertificatePayload; token: string } | null {
  const code = params.get("code");
  const name = params.get("name");
  const fund = params.get("fund");
  const unitsStr = params.get("units");
  const costStr = params.get("cost");
  const totalStr = params.get("total");
  const date = params.get("date");
  const token = params.get("token");
  if (!code || !name || !fund || !unitsStr || !costStr || !totalStr || !date || !token) {
    return null;
  }
  const units = Number(unitsStr);
  const cost = Number(costStr);
  const total = Number(totalStr);
  if (!Number.isFinite(units) || !Number.isFinite(cost) || !Number.isFinite(total)) {
    return null;
  }
  return {
    payload: {
      investorCode: code,
      investorName: name,
      fundCode: fund,
      units,
      costPricePerUnit: cost,
      totalValue: total,
      issueDate: date,
    },
    token,
  };
}
