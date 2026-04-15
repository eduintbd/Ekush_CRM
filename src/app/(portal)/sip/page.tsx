"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, FileDown, Upload, Image } from "lucide-react";

interface SipPlan {
  id: string;
  amount: number;
  frequency: string;
  debitDay: number;
  startDate: string;
  endDate: string | null;
  status: string;
  fund: { code: string; name: string; currentNav: number };
}

interface Fund { code: string; name: string; currentNav: number; }

interface BankAccount {
  id: string;
  bankName: string;
  branchName: string | null;
  accountNumber: string;
  routingNumber: string | null;
  isPrimary: boolean;
}

export default function SipPage() {
  const [plans, setPlans] = useState<SipPlan[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fundCode: "", amount: "", frequency: "MONTHLY", debitDay: "5", tenure: "5" });
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showDDI, setShowDDI] = useState(false);

  // Bank account state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [showBankChange, setShowBankChange] = useState(false);
  const [bankMode, setBankMode] = useState<"existing" | "cheque" | "manual">("existing");
  const [newBank, setNewBank] = useState({ holderName: "", bankName: "", branchName: "", accountNumber: "", routingNumber: "" });
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [savingBank, setSavingBank] = useState(false);

  const fetchPlans = () => fetch("/api/sip").then(r => r.json()).then(setPlans).catch(() => {});
  const fetchFunds = () => fetch("/api/funds").then(r => r.json()).then(setFunds).catch(() => {});
  const fetchBanks = () =>
    fetch("/api/profile/banks")
      .then((r) => r.json())
      .then((data: BankAccount[]) => {
        setBankAccounts(data);
        const primary = data.find((b) => b.isPrimary) || data[0];
        if (primary) setSelectedBankId(primary.id);
      })
      .catch(() => {});

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);

  const handleSaveNewBank = async () => {
    if (bankMode === "cheque" && chequeFile) {
      setSavingBank(true);
      try {
        const formData = new FormData();
        formData.append("action", "add_bank_cheque");
        formData.append("chequeLeaf", chequeFile);
        const res = await fetch("/api/profile/bank-upload", { method: "POST", body: formData });
        if (res.ok) {
          await fetchBanks();
          setShowBankChange(false);
          setBankMode("existing");
          setChequeFile(null);
        }
      } finally { setSavingBank(false); }
    } else if (bankMode === "manual" && newBank.bankName && newBank.accountNumber) {
      setSavingBank(true);
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add_bank", ...newBank }),
        });
        if (res.ok) {
          await fetchBanks();
          setShowBankChange(false);
          setBankMode("existing");
          setNewBank({ holderName: "", bankName: "", branchName: "", accountNumber: "", routingNumber: "" });
        }
      } finally { setSavingBank(false); }
    }
  };

  useEffect(() => { fetchPlans(); fetchFunds(); fetchBanks(); }, []);

  const [bankWarning, setBankWarning] = useState("");

  const handleCreateClick = (e: React.FormEvent) => {
    e.preventDefault();
    setBankWarning("");
    if (!selectedBank) {
      setBankWarning("Bank account is mandatory to create a SIP. Please add your bank account details above.");
      return;
    }
    setShowTerms(true);
  };

  const handleAcceptTerms = () => {
    setShowTerms(false);
    setShowDDI(true);
  };

  const handleConfirmCreate = async () => {
    setShowDDI(false);
    setLoading(true);
    try {
      const res = await fetch("/api/sip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), debitDay: parseInt(form.debitDay) }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ fundCode: "", amount: "", frequency: "MONTHLY", debitDay: "5", tenure: "5" });
        fetchPlans();
      }
    } finally {
      setLoading(false);
    }
  };

  const activePlans = plans.filter(p => p.status === "ACTIVE");
  const totalMonthly = activePlans.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">SIP Management</h1>
          <p className="text-sm text-text-body">Manage your Systematic Investment Plans</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="bg-ekush-orange hover:bg-ekush-orange/90 text-white rounded-[5px] text-[13px]">
          <Plus className="w-4 h-4 mr-1" /> New SIP
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-[10px] shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-text-body">Active Plans</p>
            <p className="text-2xl font-bold text-green-600 font-rajdhani">{activePlans.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[10px] shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-text-body">Monthly Investment</p>
            <p className="text-2xl font-bold text-text-dark font-rajdhani">{totalMonthly.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[10px] shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-text-body">Total Plans</p>
            <p className="text-2xl font-bold text-text-dark font-rajdhani">{plans.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="border-ekush-orange/30 rounded-[10px] shadow-card">
          <CardHeader>
            <CardTitle className="text-[16px] font-semibold text-text-dark">Create New SIP</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateClick} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-label block mb-1">Fund</label>
                <select value={form.fundCode} onChange={(e) => setForm({ ...form, fundCode: e.target.value })} className="w-full h-[50px] rounded-[5px] border border-input-border bg-input-bg px-3 text-sm" required>
                  <option value="">Select fund...</option>
                  {funds.map(f => <option key={f.code} value={f.code}>{f.code} - {f.name}</option>)}
                </select>
              </div>
              <Input label="Amount (BDT)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="5000" min="500" required />
              <div>
                <label className="text-sm font-medium text-text-label block mb-1">Debit Day</label>
                <select
                  value={form.debitDay}
                  onChange={(e) => setForm({ ...form, debitDay: e.target.value })}
                  className="w-full h-[50px] rounded-[5px] border border-input-border bg-input-bg px-3 text-sm"
                >
                  <option value="5">5th day of the month</option>
                  <option value="15">15th day of the month</option>
                  <option value="26">26th day of the month</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-text-label block mb-1">Tenure (Years)</label>
                <div className="flex gap-2">
                  <select
                    value={["3","5","7","10","12"].includes(form.tenure) ? form.tenure : "custom"}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setForm({ ...form, tenure: "" });
                      } else {
                        setForm({ ...form, tenure: e.target.value });
                      }
                    }}
                    className="flex-1 h-[50px] rounded-[5px] border border-input-border bg-input-bg px-3 text-sm"
                  >
                    <option value="3">3 Year</option>
                    <option value="5">5 Year</option>
                    <option value="7">7 Year</option>
                    <option value="10">10 Year</option>
                    <option value="12">12 Year</option>
                    <option value="custom">Custom...</option>
                  </select>
                  {!["3","5","7","10","12"].includes(form.tenure) && (
                    <input
                      type="number"
                      min="1"
                      max="30"
                      placeholder="Years"
                      value={form.tenure}
                      onChange={(e) => setForm({ ...form, tenure: e.target.value })}
                      className="w-24 h-[50px] rounded-[5px] border border-input-border bg-input-bg px-3 text-sm text-center"
                    />
                  )}
                </div>
              </div>
              {/* ── Bank Account ────────────────────────────── */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-text-label block mb-2">Bank Account</label>
                {selectedBank ? (
                  <div className="bg-page-bg rounded-[10px] p-4">
                    <p className="text-[13px] text-text-body mb-2">Your bank account details for SIP debit:</p>
                    <div className="bg-white rounded-[5px] border border-input-border p-3 space-y-1 mb-3">
                      <div className="flex justify-between text-[13px]">
                        <span className="text-text-body">A/C Name</span>
                        <span className="text-text-dark font-medium">{selectedBank.bankName}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-text-body">A/C Number</span>
                        <span className="text-text-dark font-medium">{selectedBank.accountNumber}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-text-body">Bank Name</span>
                        <span className="text-text-dark font-medium">{selectedBank.bankName}</span>
                      </div>
                      {selectedBank.branchName && (
                        <div className="flex justify-between text-[13px]">
                          <span className="text-text-body">Branch</span>
                          <span className="text-text-dark font-medium">{selectedBank.branchName}</span>
                        </div>
                      )}
                      {selectedBank.routingNumber && (
                        <div className="flex justify-between text-[13px]">
                          <span className="text-text-body">Routing Number</span>
                          <span className="text-text-dark font-medium">{selectedBank.routingNumber}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[13px] text-text-body mb-2">Do you want to change this account for SIP?</p>
                    <div className="flex gap-2">
                      <Button
                        type="button" size="sm" variant="outline"
                        className={`rounded-[5px] text-[12px] transition-colors ${!showBankChange ? "bg-green-500 text-white border-green-500" : "border-green-500 text-green-600 hover:bg-green-50"}`}
                        onClick={() => setShowBankChange(false)}
                      >
                        {!showBankChange ? "✓ " : ""}No, use this account
                      </Button>
                      <Button
                        type="button" size="sm" variant="outline"
                        className={`rounded-[5px] text-[12px] transition-colors ${showBankChange ? "bg-ekush-orange text-white border-ekush-orange" : "border-ekush-orange text-ekush-orange hover:bg-orange-50"}`}
                        onClick={() => setShowBankChange(true)}
                      >
                        Yes, change account
                      </Button>
                    </div>

                    {/* Change bank dialog */}
                    {showBankChange && (
                      <div className="mt-4 border-t border-input-border pt-4 space-y-3">
                        <div className="flex rounded-lg border overflow-hidden">
                          <button type="button" onClick={() => setBankMode("cheque")}
                            className={`flex-1 py-2 text-[12px] font-medium transition-colors ${bankMode === "cheque" ? "bg-[#1e3a5f] text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>
                            <Upload className="w-3 h-3 inline mr-1" /> Upload Cheque Leaf
                          </button>
                          <button type="button" onClick={() => setBankMode("manual")}
                            className={`flex-1 py-2 text-[12px] font-medium transition-colors ${bankMode === "manual" ? "bg-[#1e3a5f] text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>
                            Enter Manually
                          </button>
                        </div>

                        {bankMode === "cheque" ? (
                          <div>
                            <label className="block border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-[#1e3a5f] transition-colors">
                              {chequeFile ? (
                                <div>
                                  <Image className="w-6 h-6 mx-auto mb-1 text-green-600" />
                                  <p className="text-[12px] font-medium">{chequeFile.name}</p>
                                  <p className="text-[10px] text-gray-500">Click to change</p>
                                </div>
                              ) : (
                                <div>
                                  <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                                  <p className="text-[12px] text-gray-600">Click to upload cheque leaf</p>
                                  <p className="text-[10px] text-gray-400">JPG, PNG or PDF</p>
                                </div>
                              )}
                              <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => setChequeFile(e.target.files?.[0] || null)} />
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input label="A/C Holder's Name" value={newBank.holderName || ""} onChange={(e) => setNewBank({ ...newBank, holderName: e.target.value })} placeholder="Account holder name" />
                            <Input label="Bank Name" value={newBank.bankName} onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })} placeholder="e.g., Dutch Bangla Bank" />
                            <Input label="A/C Number" value={newBank.accountNumber} onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })} placeholder="Account number" />
                            <Input label="Branch Name" value={newBank.branchName} onChange={(e) => setNewBank({ ...newBank, branchName: e.target.value })} placeholder="Branch name" />
                            <Input label="Routing Number" value={newBank.routingNumber} onChange={(e) => setNewBank({ ...newBank, routingNumber: e.target.value })} placeholder="Routing number" />
                          </div>
                        )}

                        <Button type="button" size="sm" onClick={handleSaveNewBank} disabled={savingBank}
                          className="bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white rounded-[5px] text-[12px]">
                          {savingBank ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Save & Use This Account
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] text-text-muted bg-page-bg rounded-[10px] p-4">
                    No bank account found. Please add one in your{" "}
                    <a href="/profile" className="text-ekush-orange hover:underline">Profile</a> first.
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                {bankWarning && (
                  <p className="text-red-500 text-[13px] mb-2 bg-red-50 border border-red-200 rounded-[5px] p-2">
                    {bankWarning}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} className="bg-ekush-orange hover:bg-ekush-orange/90 text-white rounded-[5px] text-[13px]">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                    Create SIP
                  </Button>
                  <Button type="button" onClick={() => setShowCreate(false)} variant="outline" className="rounded-[5px] text-[13px]">Cancel</Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Terms & Conditions Modal */}
      {showTerms && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowTerms(false)} />
          <div className="fixed inset-4 md:inset-10 lg:inset-20 z-50 bg-white rounded-[10px] shadow-lg flex flex-col overflow-hidden">
            <div className="bg-ekush-orange px-6 py-4">
              <h2 className="text-white text-[18px] font-bold">Terms and Conditions</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 text-[14px] text-text-dark leading-relaxed space-y-4">
              <p>
                Transactions under this authorization will be subject to the BEFTN operating rules of Bangladesh Bank. All the BEFTN guidelines from Bangladesh Bank will be imposed on executing the above instruction, as applicable from time to time. Ekush Wealth Management Limited contains all the rights to change/modify/amend the terms and conditions. The guidelines of Bangladesh Bank regarding BEFTN shall govern the following terms and conditions:
              </p>
              <ol className="list-decimal pl-5 space-y-3">
                <li>BEFTN Debit facility for installment payment can be availed after the SIP is accepted and is in force. Payments other than Installment or arrears of installment (due to the previous months) should be paid via/cheque/bank draft/pay order/online transfer;</li>
                <li>Installment amount will be debited on the 5th, 15th and 26th day of each month. Investor will choose a date as per their convenient. If the day is a weekend/ holiday, installment amount will be debited on the next working day.</li>
                <li>This authorization form must reach Ekush Wealth Management Limited at least 15 (fifteen) working days before the date on which it is to be activated. If the payment instruction date falls on a weekend day or a public holiday, the same may be effective on the next working day.</li>
                <li>This instruction shall stay fully in force and result till otherwise suggested in writing by the account holder and such endorsement should be communicated to and received by a minimum of 5 (five) working days before the next installment payment is due. Any such amendment/cancellation will not release the investor from liability to the bank arising on account of the bank having executed the instruction before receipt of such amendments/cancellation.</li>
                <li>Investors should ensure that sufficient funds are available in the bank at the time of debit and this authorization is not dishonored. Sometimes it is possible that due to some technical or other reason, installment is not debited on the debit date and is delayed for few days. Please ensure availability of the funds for at least 5 (five) working days after the debit date to avoid dishonors. Ekush Funds will not be responsible for any dishonors raised by the bank and any dispute regarding the same should be taken up with the bank only.</li>
                <li>In case this Authorization is dishonored by the bank, installment for the due date(s), of the dishonored BEFTN debit for the previous month has to be paid in Cheque/ Pay order/ Demand Draft/ Online fund transfer by the investor. Any issue regarding dishonor of his authorization is to be taken up with the bank only. However, Ekush may instruct the bank for BEFTN debit of the same installment/s with the consent of the investor.</li>
                <li>Any queries, questions, comments etc. with regards to Ekush Funds and payment amount will have to raise to Ekush Wealth Management Limited and payments to the bank with regard to the settlement of amounts paid in this regard are committed and not deferrable for any reason whatsoever. The transaction appearing on the account statement will be the proof of payment.</li>
                <li>Under this instruction, the investor cannot dispute regarding the payment to Ekush Funds debited from his/her bank account. If any excess or less than the correct amount is debited, the investor will have to contact to Ekush Wealth Management Limited for clarification. Any type of refund from Ekush Funds on account of this instruction will be settled by Ekush Funds to its investor.</li>
                <li>No SIP installment receipt will be issued by Ekush Funds for BEFTN debit Payments. An annual statement or certificate of SIP payments, as applicable, may be obtained from Ekush Wealth Management Limited upon written request of the investor.</li>
                <li>After maturity the investor may- a) continue the installment amount for another tenure b) keep the matured amount as Non-SIP investment c) transfer the matured amount to the designated bank account of the investor.</li>
                <li>For the auto-renewal option, the investor has to submit another &quot;Auto debit Instruction Form&quot; having validity for another specific period.</li>
                <li>There will be no minimum lot size of units under SIP. Any remaining fraction amount will be converted when it sums up to one unit.</li>
              </ol>
            </div>
            <div className="px-6 py-4 border-t border-input-border flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowTerms(false)}
                className="rounded-[5px] text-[13px] bg-red-500 text-white border-red-500 hover:bg-red-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAcceptTerms}
                className="rounded-[5px] text-[13px] bg-[#2DAAB8] border-[#2DAAB8] hover:bg-[#259BA8] text-white"
              >
                OK
              </Button>
            </div>
          </div>
        </>
      )}

      {/* DDI Preview Popup */}
      {showDDI && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDDI(false)} />
          <div className="fixed inset-10 md:inset-20 lg:inset-x-40 lg:inset-y-16 z-50 bg-white rounded-[10px] shadow-lg flex flex-col overflow-hidden">
            <div className="bg-navy px-6 py-4">
              <h2 className="text-white text-[16px] font-bold">Confirmation</h2>
              <p className="text-white/70 text-[13px]">Please confirm to complete the transaction</p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* DDI Form Preview Link */}
              <div className="text-center mb-6">
                <a
                  href={`/forms/ddi?fundCode=${encodeURIComponent(form.fundCode)}&amount=${encodeURIComponent(form.amount)}&debitDay=${encodeURIComponent(form.debitDay)}&tenure=${encodeURIComponent(form.tenure)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-[#2DAAB8] text-[#2DAAB8] rounded-[5px] text-[14px] font-medium hover:bg-[#2DAAB8] hover:text-white transition-colors"
                >
                  Your form preview <FileDown className="w-4 h-4" />
                </a>
              </div>

              {/* SIP Summary */}
              <div className="bg-page-bg rounded-[10px] p-6 space-y-3">
                <div className="flex justify-between text-[14px]">
                  <span className="text-text-body">Fund</span>
                  <span className="text-text-dark font-medium">{funds.find(f => f.code === form.fundCode)?.name || form.fundCode}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-text-body">Monthly Amount</span>
                  <span className="text-text-dark font-medium">BDT {Number(form.amount).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-text-body">Debit Day</span>
                  <span className="text-text-dark font-medium">{form.debitDay}th of each month</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-text-body">Tenure</span>
                  <span className="text-text-dark font-medium">{form.tenure} Year{parseInt(form.tenure) > 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-input-border flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDDI(false)}
                className="rounded-[5px] text-[13px] bg-red-500 text-white border-red-500 hover:bg-red-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCreate}
                disabled={loading}
                className="rounded-[5px] text-[13px] bg-ekush-orange border-ekush-orange hover:bg-ekush-orange/90 text-white"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirm
              </Button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
