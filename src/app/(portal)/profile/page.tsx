import { getSession } from "@/lib/auth";


import { prisma, withRetry } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INVESTOR_TYPE_LABELS } from "@/lib/constants";
import { User, Phone, Mail, MapPin, CreditCard, Shield, Users, Edit, Briefcase, Heart } from "lucide-react";
import {
  EditContactForm,
  EditPersonalForm,
  EditBoAccountForm,
  EditFamilyForm,
  EditDividendOptionForm,
  AddBankForm,
  AddNomineeForm,
  DeleteButton,
} from "@/components/profile/edit-forms";

async function getInvestorProfile(investorId: string) {
  return prisma.investor.findUnique({
    where: { id: investorId },
    include: {
      user: { select: { email: true, phone: true, twoFactorEnabled: true, status: true, lastLoginAt: true } },
      bankAccounts: { orderBy: { createdAt: "asc" } },
      nominees: { orderBy: { createdAt: "asc" } },
      kycRecords: { orderBy: { createdAt: "desc" } },
    },
  });
}

export default async function ProfilePage() {
  const session = await getSession();
  let investorId = (session?.user as any)?.investorId;

  // Fallback: if investorId missing from session metadata, look it up from DB
  if (!investorId && session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { investor: { select: { id: true } } },
    });
    investorId = user?.investor?.id;
  }

  if (!investorId) {
    return <p className="text-text-body text-center py-20">Investor profile not found. Please log out and log back in.</p>;
  }

  let investor;
  try {
    investor = await withRetry(() => getInvestorProfile(investorId));
  } catch (err) {
    console.error("Profile fetch error:", err);
    return <p className="text-text-body text-center py-20">Could not load profile. Please refresh the page.</p>;
  }
  if (!investor) return <p className="text-text-body text-center py-20">Profile not found.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">Edit Profile</h1>

      {/* Personal Info (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px] flex items-center gap-2">
            <User className="w-4 h-4 text-icon-muted" /> Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Name" value={investor.name} />
            <InfoRow label="Investor Code" value={investor.investorCode} />
            <InfoRow label="Type" value={INVESTOR_TYPE_LABELS[investor.investorType] || investor.investorType} />
            <InfoRow label="Title" value={investor.title || "N/A"} />
            <InfoRow label="Account Status">
              <Badge variant={investor.user.status === "ACTIVE" ? "active" : "pending"}>
                {investor.user.status}
              </Badge>
            </InfoRow>
          </div>
        </CardContent>
      </Card>

      {/* BO / Demat Account + Family Information + Dividend Option (editable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-icon-muted" /> BO / Demat Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditBoAccountForm
              boId={investor.boId || undefined}
              dpId={investor.dpId || undefined}
              brokerageHouse={investor.brokerageHouse || undefined}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[16px] flex items-center gap-2">
              <Heart className="w-4 h-4 text-icon-muted" /> Family Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditFamilyForm
              fatherName={investor.fatherName || undefined}
              motherName={investor.motherName || undefined}
              spouseName={investor.spouseName || undefined}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[16px] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-icon-muted" /> Dividend Preference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EditDividendOptionForm
            current={(investor.dividendOption === "CIP" ? "CIP" : "CASH") as "CASH" | "CIP"}
          />
        </CardContent>
      </Card>

      {/* Editable Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-[16px] flex items-center gap-2">
              <Mail className="w-4 h-4 text-icon-muted" /> Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditContactForm
              email={investor.user.email || undefined}
              phone={investor.user.phone || undefined}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[16px] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-icon-muted" /> Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditPersonalForm
              address={investor.address || undefined}
              nidNumber={investor.nidNumber || undefined}
              tinNumber={investor.tinNumber || undefined}
            />
          </CardContent>
        </Card>
      </div>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[16px] flex items-center gap-2">
            <Shield className="w-4 h-4 text-icon-muted" /> Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex justify-between items-center p-4 bg-page-bg rounded-[10px]">
              <span className="text-[13px] text-text-body">Two-Factor Auth</span>
              <Badge variant={investor.user.twoFactorEnabled ? "active" : "outline"}>
                {investor.user.twoFactorEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-4 bg-page-bg rounded-[10px]">
              <span className="text-[13px] text-text-body">Last Login</span>
              <span className="text-[13px] font-medium text-text-dark">
                {investor.user.lastLoginAt ? new Date(investor.user.lastLoginAt).toLocaleString("en-GB") : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-page-bg rounded-[10px]">
              <span className="text-[13px] text-text-body">KYC Status</span>
              <Badge variant={investor.kycRecords.some(k => k.status === "VERIFIED") ? "active" : "pending"}>
                {investor.kycRecords.some(k => k.status === "VERIFIED") ? "Verified" : "Pending"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[16px] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-icon-muted" /> Bank Accounts
          </CardTitle>
          <AddBankForm investorName={investor.name} />
        </CardHeader>
        <CardContent>
          {investor.bankAccounts.filter((ba) => ba.status !== "REJECTED").length === 0 ? (
            <p className="text-text-body text-sm">No bank accounts linked. Add one above.</p>
          ) : (
            <div className="space-y-3">
              {investor.bankAccounts
                .filter((ba) => ba.status !== "REJECTED")
                .map((ba) => {
                  const isPending = ba.status === "PENDING_APPROVAL";
                  return (
                    <div key={ba.id} className="flex items-center justify-between p-4 bg-page-bg rounded-[10px]">
                      <div className="flex items-center gap-3">
                        {ba.chequeLeafUrl && (
                          <a href={ba.chequeLeafUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                            <img src={ba.chequeLeafUrl} alt="Cheque leaf" className="w-16 h-10 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity" />
                          </a>
                        )}
                        <div>
                          <p className="font-medium text-[14px] text-text-dark">
                            {isPending ? (
                              <>
                                {ba.bankName === "Pending Review" ? "New bank (cheque uploaded)" : ba.bankName}
                                <span className="ml-2 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                  Pending admin approval
                                </span>
                              </>
                            ) : (
                              ba.bankName
                            )}
                          </p>
                          {!isPending && (
                            <p className="text-[12px] text-text-body">
                              {ba.branchName ? `${ba.branchName} - ` : ""}A/C: {ba.accountNumber}
                            </p>
                          )}
                          {isPending && (
                            <p className="text-[11px] text-text-muted mt-1">
                              Admin will review and fill in / confirm the bank details. Once approved it will appear here as a secondary account you can use for SIP.
                            </p>
                          )}
                          {ba.routingNumber && !isPending && (
                            <p className="text-[12px] text-text-muted">Routing: {ba.routingNumber}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isPending && (
                          <Badge variant={ba.isPrimary ? "active" : "pending"}>
                            {ba.isPrimary ? "Primary" : "Secondary"}
                          </Badge>
                        )}
                        <DeleteButton id={ba.id} action="delete_bank" />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nominees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[16px] flex items-center gap-2">
            <Users className="w-4 h-4 text-icon-muted" /> Nominees
          </CardTitle>
          <AddNomineeForm />
        </CardHeader>
        <CardContent>
          {investor.nominees.length === 0 ? (
            <p className="text-text-body text-sm">No nominees registered. Add one above.</p>
          ) : (
            <div className="space-y-3">
              {investor.nominees.map((n) => (
                <div key={n.id} className="flex items-center justify-between p-4 bg-page-bg rounded-[10px]">
                  <div>
                    <p className="font-medium text-[14px] text-text-dark">{n.name}</p>
                    <p className="text-[12px] text-text-body">
                      {n.relationship || "Relationship not specified"}
                      {n.nidNumber && ` | NID: ${n.nidNumber}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-navy font-rajdhani">{Number(n.share)}%</span>
                    <DeleteButton id={n.id} action="delete_nominee" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-[13px] text-text-body">{label}</span>
      {children || <span className="text-[13px] font-medium text-text-dark">{value}</span>}
    </div>
  );
}
