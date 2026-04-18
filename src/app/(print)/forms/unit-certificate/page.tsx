import { getSession } from "@/lib/auth";
import { prisma, withRetry } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { buildVerificationUrl } from "@/lib/certificate-token";
import { numberToWordsBDT } from "@/lib/number-to-words";
import { CertificateQR } from "@/components/certificates/CertificateQR";

export const dynamic = "force-dynamic";

const FUND_CODES = ["EFUF", "EGF", "ESRF"] as const;

export default async function UnitCertificatePrintPage({
  searchParams,
}: {
  searchParams: { fund?: string };
}) {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/login");
  }
  if (!session) redirect("/login");

  const fundCode = searchParams.fund ?? "";
  if (!(FUND_CODES as readonly string[]).includes(fundCode)) {
    return <Message text="Invalid fund code." />;
  }

  let investorId = (session.user as any)?.investorId;
  if (!investorId && session.user?.id) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { investor: { select: { id: true } } },
    });
    investorId = u?.investor?.id;
  }
  if (!investorId) return <Message text="Investor profile not found." />;

  const fund = await withRetry(() =>
    prisma.fund.findUnique({
      where: { code: fundCode },
      select: { id: true, code: true, name: true, currentNav: true },
    }),
  );
  if (!fund) return <Message text="Fund not found." />;
  if (!fund.currentNav || fund.currentNav <= 0) {
    return (
      <Message text="Certificate is not available for this fund at the moment. Market value has not been published yet." />
    );
  }

  const [investor, holding] = await Promise.all([
    withRetry(() =>
      prisma.investor.findUnique({
        where: { id: investorId },
        select: { name: true, investorCode: true, title: true },
      }),
    ),
    withRetry(() =>
      prisma.fundHolding.findUnique({
        where: { investorId_fundId: { investorId, fundId: fund.id } },
        select: {
          totalCurrentUnits: true,
          totalCostValueCurrent: true,
          avgCost: true,
        },
      }),
    ),
  ]);

  if (!investor) return <Message text="Investor not found." />;
  if (!holding || holding.totalCurrentUnits <= 0) {
    return <Message text="You do not currently hold any units in this fund." />;
  }

  const units = holding.totalCurrentUnits;
  const totalValue = holding.totalCostValueCurrent;
  const costPricePerUnit = holding.avgCost || (units > 0 ? totalValue / units : 0);
  const totalInWords = numberToWordsBDT(totalValue);

  const today = new Date();
  const issueDateISO = today.toISOString().slice(0, 10);
  const issueDateDisplay = today
    .toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    .toUpperCase();

  const baseUrl =
    process.env.CERTIFICATE_VERIFICATION_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://ekush.aibd.ai";

  let verificationUrl: string | null = null;
  try {
    verificationUrl = buildVerificationUrl(baseUrl, {
      investorCode: investor.investorCode,
      investorName: investor.name,
      fundCode: fund.code,
      units,
      costPricePerUnit,
      totalValue,
      issueDate: issueDateISO,
    });
  } catch (err) {
    console.error("Unit certificate signing failed:", err);
    return (
      <Message text="Unit Certificate QR signing is not configured. Set CERTIFICATE_HMAC_SECRET in the environment and redeploy." />
    );
  }

  const nf = new Intl.NumberFormat("en-IN");
  const nf2 = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print { body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;} .no-print{display:none!important;} .print-page{width:210mm;min-height:297mm;padding:0;margin:0;box-shadow:none!important;} }
        @page { size: A4 portrait; margin: 0; }
      `,
        }}
      />

      <div
        className="no-print"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 50,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          id="print-btn"
          style={{
            padding: "8px 16px",
            background: "#F27023",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Save as PDF / Print
        </button>
        <a
          href={`/unit-certificate?fund=${fund.code}`}
          style={{
            padding: "8px 16px",
            background: "#fff",
            color: "#333",
            border: "1px solid #ddd",
            borderRadius: 6,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Back
        </a>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('print-btn').addEventListener('click',function(){window.print()});`,
        }}
      />

      <div
        className="print-page"
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "0 auto",
          background: "#fff",
          fontFamily: "'Times New Roman', Georgia, serif",
          fontSize: "12pt",
          color: "#1a1a1a",
          lineHeight: 1.6,
          position: "relative",
        }}
      >
        {/* Banner */}
        <img
          src="/banner_for_portfolio.png"
          alt=""
          style={{ width: "100%", display: "block" }}
        />

        <div style={{ padding: "14mm 22mm 44mm 22mm" }}>
          {/* Title */}
          <h1
            style={{
              fontFamily: "'Brush Script MT', 'Great Vibes', cursive",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "40pt",
              textAlign: "center",
              margin: "0 0 14mm 0",
              color: "#1a1a1a",
              letterSpacing: "0.5px",
            }}
          >
            Certificate of Unit Allotment
          </h1>

          {/* Body */}
          <div style={{ fontSize: "13pt", lineHeight: 1.9 }}>
            <p style={{ margin: "0 0 8mm 0" }}>
              <em>This is to certify that </em>
              <span style={fieldStyle}>
                {investor.title ? `${investor.title} ` : ""}
                {investor.name}
              </span>
            </p>

            <p style={{ margin: "0 0 8mm 0" }}>
              <em>has been allotted with </em>
              <span style={{ ...fieldStyle, minWidth: "40mm" }}>
                {nf.format(units)}
              </span>{" "}
              <em>Units of </em>
              <span style={{ ...fieldStyle, fontWeight: 700 }}>{fund.name}</span>
            </p>

            <p style={{ margin: "0 0 8mm 0" }}>
              <em>at a cost price </em>
              <strong>
                <em>per unit</em>
              </strong>{" "}
              <em>of BDT </em>
              <span style={{ ...fieldStyle, minWidth: "22mm" }}>
                {nf2.format(costPricePerUnit)}
              </span>{" "}
              <em>totaling </em>
              <strong>
                <em>BDT</em>
              </strong>{" "}
              <span style={{ ...fieldStyle, minWidth: "46mm" }}>
                {nf2.format(totalValue)}/=
              </span>
            </p>

            <p style={{ margin: "0 0 8mm 0" }}>
              <em>(in words) </em>
              <span
                style={{
                  ...fieldStyle,
                  minWidth: "140mm",
                  textAlign: "left",
                  paddingLeft: "6px",
                }}
              >
                {totalInWords}.
              </span>
            </p>
          </div>

          {/* Date + Signature footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: "30mm",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "11pt", marginBottom: "2mm" }}>
                {issueDateDisplay}
              </div>
              <div
                style={{
                  fontStyle: "italic",
                  fontSize: "11pt",
                  borderTop: "1px solid #333",
                  paddingTop: "1mm",
                  minWidth: "40mm",
                }}
              >
                Date
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ height: "18mm" }} />
              <div
                style={{
                  fontStyle: "italic",
                  fontSize: "11pt",
                  borderTop: "1px solid #333",
                  paddingTop: "1mm",
                  minWidth: "55mm",
                }}
              >
                Authorized Signature
              </div>
            </div>
          </div>

          {/* QR code — bottom center */}
          <div
            style={{
              position: "absolute",
              bottom: "22mm",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                padding: "4px",
                background: "#fff",
                border: "1px solid #e5e5e5",
                borderRadius: 2,
              }}
            >
              <CertificateQR value={verificationUrl} size={96} />
            </div>
            <div
              style={{
                fontSize: "8pt",
                fontStyle: "italic",
                color: "#555",
                marginTop: "2px",
              }}
            >
              Scan to verify
            </div>
            <div style={{ fontSize: "7pt", color: "#777" }}>
              Investor Code: {investor.investorCode} · {fund.code}
            </div>
          </div>
        </div>

        {/* Orange footer */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#F27023",
            color: "#fff",
            padding: "3mm 6mm",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "8pt",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <span>+8801713-086101</span>
          <span>info@ekushwml.com</span>
          <span>
            Apt-A3, House: 17, Road: 01, Block: A, Niketon, Gulshan 01, Dhaka-1212
          </span>
          <span>www.ekushwml.com</span>
        </div>
      </div>
    </>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "inline-block",
  borderBottom: "1px solid #333",
  padding: "0 8px 2px 8px",
  minWidth: "60mm",
  textAlign: "center",
  fontStyle: "normal",
};

function Message({ text }: { text: string }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "#666", fontFamily: "Arial, sans-serif" }}>
      {text}
    </div>
  );
}
