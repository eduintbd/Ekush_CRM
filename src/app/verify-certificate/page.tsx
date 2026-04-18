import { parsePayloadFromParams, verifyCertificate } from "@/lib/certificate-token";

export const dynamic = "force-dynamic";

const FUND_NAMES: Record<string, string> = {
  EFUF: "Ekush First Unit Fund",
  EGF: "Ekush Growth Fund",
  ESRF: "Ekush Stable Return Fund",
};

export default function VerifyCertificatePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string") params.set(k, v);
  }
  const parsed = parsePayloadFromParams(params);
  const valid = parsed ? verifyCertificate(parsed.payload, parsed.token) : false;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#EFF1F7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter', Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 4px 24px rgba(15,30,61,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: valid ? "#16A34A" : "#DC2626",
            color: "#fff",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 28, lineHeight: 1 }}>{valid ? "✓" : "✗"}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {valid ? "Verified Certificate" : "Invalid or Tampered Certificate"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              Ekush Wealth Management Limited
            </div>
          </div>
        </div>

        <div style={{ padding: "24px" }}>
          {valid && parsed ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Row label="AMC Name" value="Ekush Wealth Management Limited" />
              <Row label="Investor Code" value={parsed.payload.investorCode} />
              <Row label="Investor Name" value={parsed.payload.investorName} />
              <Row
                label="Fund"
                value={`${FUND_NAMES[parsed.payload.fundCode] ?? parsed.payload.fundCode} (${parsed.payload.fundCode})`}
              />
              <Row
                label="Units Held"
                value={new Intl.NumberFormat("en-IN").format(parsed.payload.units)}
              />
              <Row
                label="Issue Date"
                value={formatDate(parsed.payload.issueDate)}
              />
            </div>
          ) : (
            <p style={{ color: "#555", fontSize: 14, lineHeight: 1.6 }}>
              This certificate could not be verified. Please contact Ekush Wealth
              Management Limited for assistance.
            </p>
          )}
        </div>

        <div
          style={{
            background: "#F27023",
            color: "#fff",
            padding: "12px 24px",
            fontSize: 11,
            textAlign: "center",
          }}
        >
          www.ekushwml.com · info@ekushwml.com · +8801713-086101
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        borderBottom: "1px solid #F3F4F6",
        paddingBottom: 8,
      }}
    >
      <span style={{ color: "#6B7280", fontSize: 12, fontWeight: 500 }}>{label}</span>
      <span style={{ color: "#111827", fontSize: 13, fontWeight: 600, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
