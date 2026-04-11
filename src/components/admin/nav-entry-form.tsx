"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, CheckCircle, ChevronDown } from "lucide-react";

interface Fund {
  id: string;
  code: string;
  name: string;
  currentNav: number;
}

export function NavEntryForm({ funds }: { funds: Fund[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [navValues, setNavValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    funds.forEach((f) => {
      vals[f.code] = String(f.currentNav);
    });
    return vals;
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, navValues }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-card rounded-[10px]">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-[15px] font-semibold font-rajdhani text-text-dark">
            Add / Update NAV Entry
          </CardTitle>
          <ChevronDown
            className={`w-4 h-4 text-text-body transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <Input
            label="NAV Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {funds.map((f) => (
            <div key={f.code} className="flex items-center gap-4">
              <div className="w-20">
                <Badge variant="outline">{f.code}</Badge>
              </div>
              <div className="flex-1">
                <Input
                  label={f.name}
                  type="number"
                  step="0.0001"
                  value={navValues[f.code] || ""}
                  onChange={(e) =>
                    setNavValues({ ...navValues, [f.code]: e.target.value })
                  }
                  placeholder="Enter NAV"
                />
              </div>
              <div className="text-xs text-text-muted w-24 text-right">
                Current: {Number(f.currentNav).toFixed(4)}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={loading} variant="default">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save NAV
            </Button>
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> NAV updated successfully!
              </span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
