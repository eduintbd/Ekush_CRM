import { ApprovalsPanel } from "@/components/admin/approvals-panel";

export default function ApprovalsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-semibold text-text-dark font-rajdhani">
          Approval Queue
        </h1>
        <p className="text-[13px] text-text-body">
          Review and approve/reject pending requests (maker-checker)
        </p>
      </div>
      <div className="shadow-card rounded-[10px] border border-amber-300 bg-white overflow-hidden">
        <ApprovalsPanel />
      </div>
    </div>
  );
}
