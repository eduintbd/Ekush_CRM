import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PurchaseFormPage({
  searchParams,
}: {
  searchParams: {
    fundName?: string;
    amount?: string;
    units?: string;
    nav?: string;
    payment?: string;
  };
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const investorId = (session.user as any)?.investorId;
  if (!investorId) redirect("/dashboard");

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: { bankAccounts: { where: { isPrimary: true }, take: 1 } },
  });

  if (!investor) redirect("/dashboard");

  const fundName = searchParams.fundName || "";
  const amountNum = parseFloat(searchParams.amount || "0");
  const unitsNum = parseInt(searchParams.units || "0");
  const navNum = parseFloat(searchParams.nav || "0");
  const paymentMethod = searchParams.payment || "Bank Transfer";
  const bank = investor.bankAccounts[0];

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = String(today.getFullYear());
  const dateDigits = (dd + mm + yyyy).split("");

  const isOnline = /transfer|online/i.test(paymentMethod);
  const isCheque = /cheque|pay.?order/i.test(paymentMethod);
  const isCash = /cash/i.test(paymentMethod);

  // ── Shared style tokens ───────────────────────────────────────
  const FONT = "Bahnschrift, 'Segoe UI', Calibri, sans-serif";
  const VALUE_COLOR = "#355900";
  const GREEN_BG = "#d8edbb";
  const GREEN_BORDER = "#b8d4a0";
  const BOX_H = "28px";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
          .no-print{display:none!important;}
          .a4{box-shadow:none!important;}
        }
        @page{size:A4 portrait;margin:0;}
        *{box-sizing:border-box;}
      `}} />

      {/* Floating buttons (hidden on print) */}
      <div className="no-print" style={{position:"fixed",top:16,right:16,zIndex:50,display:"flex",gap:8}}>
        <button id="pb" style={{padding:"8px 16px",background:"#F27023",color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer"}}>
          Save as PDF / Print
        </button>
        <a href="/transactions/buy" style={{padding:"8px 16px",background:"#fff",color:"#333",border:"1px solid #ccc",borderRadius:6,fontSize:13,fontWeight:600,textDecoration:"none"}}>
          Back
        </a>
      </div>
      <script dangerouslySetInnerHTML={{__html:`document.getElementById('pb').onclick=function(){window.print()};`}} />

      {/* ═══ A4 PAGE ═══════════════════════════════════════════ */}
      <div className="a4" style={{
        width:"210mm", minHeight:"297mm", margin:"0 auto", background:"#fff",
        boxShadow:"0 4px 40px rgba(0,0,0,0.12)", padding:"15mm 20mm 12mm 20mm",
        fontFamily: FONT,
      }}>

        {/* ── HEADER ──────────────────────────────────────────── */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div style={{flex:1,paddingTop:"8px"}}>
            <h1 style={{
              fontFamily:FONT, fontSize:"18pt", fontWeight:700, color:"#000",
              margin:0, lineHeight:1.15,
            }}>
              INVESTOR&apos;S PURCHASE FORM
            </h1>
            <p style={{
              fontFamily:FONT, fontSize:"11pt", fontWeight:400, color:"#000",
              margin:"5px 0 0 0", textDecoration:"underline", textTransform:"uppercase",
            }}>
              ASSET MANAGER: EKUSH WEALTH MANAGEMENT LIMITED
            </p>
          </div>
          <img src="/logo.png" alt="Ekush" style={{height:"58px",marginTop:"-2px"}} />
        </div>

        <div style={{height:"18px"}} />

        {/* ── FUND NAME + DATE ────────────────────────────────── */}
        <div style={{display:"flex",gap:"14px",alignItems:"flex-end",marginBottom:"12px"}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:FONT,fontSize:"11px",fontWeight:600,color:"#000",marginBottom:"2px"}}>
              Name of the Fund
            </div>
            <div style={{background:GREEN_BG,border:`1px solid ${GREEN_BORDER}`,height:BOX_H,display:"flex",alignItems:"center",padding:"0 10px"}}>
              <span style={{fontFamily:FONT,fontSize:"12px",fontWeight:600,color:VALUE_COLOR}}>{fundName}</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:"8px"}}>
            <span style={{fontFamily:FONT,fontSize:"11px",fontWeight:600,color:"#000",paddingBottom:"6px"}}>Date</span>
            <div style={{display:"flex",gap:"2px"}}>
              {dateDigits.map((d,i)=>(
                <div key={i} style={{
                  width:"22px",height:BOX_H,border:`1px solid ${GREEN_BORDER}`,background:GREEN_BG,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontFamily:FONT,fontSize:"13px",fontWeight:700,color:VALUE_COLOR,
                }}>{d}</div>
              ))}
            </div>
          </div>
        </div>

        <div style={{height:"4px"}} />

        {/* ── INVESTOR CODE ───────────────────────────────────── */}
        <div style={{marginBottom:"6px"}}>
          <div style={{fontFamily:FONT,fontSize:"11px",fontWeight:600,color:"#000",marginBottom:"2px"}}>Investor Code</div>
          <div style={{background:GREEN_BG,border:`1px solid ${GREEN_BORDER}`,height:BOX_H,display:"flex",alignItems:"center",padding:"0 10px"}}>
            <span style={{fontFamily:FONT,fontSize:"12px",fontWeight:600,color:VALUE_COLOR}}>{investor.investorCode}</span>
          </div>
        </div>

        {/* ── INVESTOR NAME ───────────────────────────────────── */}
        <div style={{marginBottom:"18px"}}>
          <div style={{fontFamily:FONT,fontSize:"11px",fontWeight:600,color:"#000",marginBottom:"2px"}}>Investor Name</div>
          <div style={{background:GREEN_BG,border:`1px solid ${GREEN_BORDER}`,height:BOX_H,display:"flex",alignItems:"center",padding:"0 10px"}}>
            <span style={{fontFamily:FONT,fontSize:"12px",fontWeight:600,color:VALUE_COLOR}}>{investor.name}</span>
          </div>
        </div>

        {/* ── CONFIRMATION OF UNIT ALLOCATION ──────────────────── */}
        <div style={{textAlign:"center",marginBottom:"8px"}}>
          <span style={{fontFamily:FONT,fontSize:"11px",fontWeight:700,textDecoration:"underline",textTransform:"uppercase",letterSpacing:"0.5px"}}>
            Confirmation of Unit Allocation
          </span>
        </div>

        {/* Allocation rows — labels above, two green boxes separated by line */}
        {[
          { label:"Investment Amount", value:amountNum.toLocaleString("en-IN",{maximumFractionDigits:2}), words:numberToWords(amountNum) },
          { label:"Cost Price Per Unit", value:navNum.toFixed(4), words:numberToWords(Math.round(navNum))+" (per unit)" },
          { label:"Number of Allotted Units", value:unitsNum.toLocaleString("en-IN"), words:numberToWords(unitsNum) },
        ].map((row,i)=>(
          <div key={i} style={{marginBottom:"6px"}}>
            {/* Labels row */}
            <div style={{display:"flex",marginBottom:"2px"}}>
              <div style={{width:"45%",fontFamily:FONT,fontSize:"11px",fontWeight:600,color:"#000"}}>{row.label}</div>
              <div style={{width:"10%"}} />
              <div style={{width:"45%",fontFamily:FONT,fontSize:"11px",fontWeight:600,color:"#000",textAlign:"right"}}>In Words</div>
            </div>
            {/* Green boxes row with divider line */}
            <div style={{display:"flex",border:`1px solid ${GREEN_BORDER}`,overflow:"hidden"}}>
              <div style={{width:"45%",background:GREEN_BG,height:BOX_H,display:"flex",alignItems:"center",padding:"0 10px"}}>
                <span style={{fontFamily:FONT,fontSize:"12px",fontWeight:700,color:VALUE_COLOR}}>{row.value}</span>
              </div>
              <div style={{width:"1px",background:GREEN_BORDER}} />
              <div style={{flex:1,background:GREEN_BG,height:BOX_H,display:"flex",alignItems:"center",padding:"0 10px"}}>
                <span style={{fontFamily:FONT,fontSize:"11px",fontWeight:600,fontStyle:"italic",color:VALUE_COLOR}}>{row.words}</span>
              </div>
            </div>
          </div>
        ))}

        <div style={{height:"6px"}} />

        {/* ── MODE OF TRANSACTION ──────────────────────────────── */}
        <div style={{textAlign:"center",marginBottom:"8px"}}>
          <span style={{fontFamily:FONT,fontSize:"11px",fontWeight:700,textDecoration:"underline"}}>Mode of Transaction</span>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",padding:"0 16px",marginBottom:"12px"}}>
          {[
            {label:"Online Transfer",checked:isOnline},
            {label:"Cheque/Pay Order",checked:isCheque},
            {label:"Cash",checked:isCash},
          ].map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <div style={{
                width:"14px",height:"14px",border:"1.5px solid #999",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"11px",fontWeight:700,
                color:item.checked?VALUE_COLOR:"transparent",
                background:item.checked?GREEN_BG:"#fff",
              }}>X</div>
              <span style={{fontFamily:FONT,fontSize:"11px"}}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* ── BANK FIELDS ──────────────────────────────────────── */}
        {[
          {label:"Bank Name",value:bank?.bankName||""},
          {label:"Branch Name",value:bank?.branchName||""},
          {label:"Routing Number",value:bank?.routingNumber||""},
          {label:"Cheque Number/Pay Order Number (if any)",value:""},
          {label:"Remarks (if any)",value:""},
        ].map((f,i)=>(
          <div key={i} style={{marginBottom:"4px"}}>
            <div style={{fontFamily:FONT,fontSize:"11px",fontWeight:600,color:"#000",marginBottom:"2px"}}>{f.label}</div>
            <div style={{background:GREEN_BG,border:`1px solid ${GREEN_BORDER}`,height:BOX_H,display:"flex",alignItems:"center",padding:"0 10px"}}>
              <span style={{fontFamily:FONT,fontSize:"12px",fontWeight:600,color:VALUE_COLOR}}>{f.value}</span>
            </div>
          </div>
        ))}

        {/* ── SPACER ───────────────────────────────────────────── */}
        <div style={{height:"32px"}} />

        {/* ── SIGNATURES ───────────────────────────────────────── */}
        <div style={{display:"flex",justifyContent:"space-between",padding:"0 2px"}}>
          {["Principal Signatory","Secondary Signatory","Additional Signatory (if any)"].map((lbl,i)=>(
            <div key={i} style={{width:"30%",textAlign:"center"}}>
              <div style={{borderTop:"1.5px solid #000",paddingTop:"4px"}}>
                <span style={{fontFamily:FONT,fontSize:"9px",color:"#777"}}>{lbl}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── VERIFIER BOX ─────────────────────────────────────── */}
        <div style={{border:"1px solid #000",marginTop:"14px"}}>
          <div style={{display:"flex"}}>
            <div style={{flex:1,padding:"6px 10px",borderRight:"1px solid #000"}}>
              <div style={{fontFamily:FONT,fontSize:"9px",color:"#777",marginBottom:"12px"}}>Verifier Name</div>
              <div style={{borderTop:"1px solid #ccc",paddingTop:"6px"}}>
                <span style={{fontFamily:FONT,fontSize:"9px",color:"#777"}}>Designation</span>
              </div>
            </div>
            <div style={{width:"100px",padding:"6px 10px"}}>
              <div style={{fontFamily:FONT,fontSize:"9px",color:"#777",textAlign:"right"}}>Signature</div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const intPart = Math.floor(Math.abs(n));
  if (intPart === 0) return "Zero";
  let remaining = intPart;
  const groups: number[] = [];
  groups.push(remaining % 1000);
  remaining = Math.floor(remaining / 1000);
  while (remaining > 0) { groups.push(remaining % 100); remaining = Math.floor(remaining / 100); }
  const scales = ["","Thousand","Lakh","Crore"];
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    let part = "";
    if (g >= 100) { part += ones[Math.floor(g / 100)] + " Hundred "; const rem = g % 100; if (rem >= 20) { part += tens[Math.floor(rem / 10)] + " " + ones[rem % 10]; } else if (rem > 0) { part += ones[rem]; } }
    else if (g >= 20) { part += tens[Math.floor(g / 10)] + " " + ones[g % 10]; }
    else { part += ones[g]; }
    parts.push(part.trim() + (scales[i] ? " " + scales[i] : ""));
  }
  return parts.join(" ").replace(/\s+/g, " ").trim() + " Only";
}
