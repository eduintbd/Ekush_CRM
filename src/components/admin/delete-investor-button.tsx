"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteInvestorButton({
  investorId,
  investorName,
}: {
  investorId: string;
  investorName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  return (
    <button
      type="button"
      disabled={deleting}
      onClick={async () => {
        if (
          !window.confirm(
            `Permanently delete "${investorName}" and all related data? This cannot be undone.`
          )
        )
          return;
        setDeleting(true);
        try {
          const res = await fetch(`/api/admin/investors/${investorId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            router.refresh();
          } else {
            const data = await res.json().catch(() => ({}));
            alert(data.error || "Delete failed");
          }
        } catch {
          alert("Network error");
        } finally {
          setDeleting(false);
        }
      }}
      className="text-red-500 hover:text-red-700 text-sm inline-flex items-center gap-0.5"
    >
      {deleting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
      Delete
    </button>
  );
}
