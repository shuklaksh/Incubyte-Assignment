"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";

interface Props {
  selectedIds: string[];
  selectAll: boolean;
  count: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkSalaryModal({ selectedIds, selectAll, count, onClose, onSuccess }: Props) {
  const [adjustmentType, setAdjustmentType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [adjustmentValue, setAdjustmentValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const val = parseFloat(adjustmentValue) || 0;
  const isValid = val > 0 && reason.length >= 10;

  const mutation = useMutation({
    mutationFn: async () => {
      const body = selectAll
        ? { selectAll: true, adjustmentType, adjustmentValue: val, reason }
        : { employeeIds: selectedIds, adjustmentType, adjustmentValue: val, reason };

      const res = await fetch("/api/employees/bulk-salary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Update failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Updated salary for ${data.updatedCount} employees`);
      onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
  const modal: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, width: 480, maxWidth: "95vw", padding: 28 };
  const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" };
  const inputSt: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none" };
  const btn: React.CSSProperties = { padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none" };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal} className="slide-in-right">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Bulk Update Salary</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Updating {count.toLocaleString()} employee{count !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={label}>Adjustment Type</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["PERCENTAGE", "FIXED"] as const).map(t => (
                <button
                  key={t}
                  id={`type-${t.toLowerCase()}`}
                  onClick={() => setAdjustmentType(t)}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: 14, cursor: "pointer", border: `1px solid ${adjustmentType === t ? "var(--primary)" : "var(--border)"}`, background: adjustmentType === t ? "var(--primary-muted)" : "var(--surface-raised)", color: adjustmentType === t ? "var(--primary)" : "var(--text-secondary)", fontWeight: 500 }}
                >
                  {t === "PERCENTAGE" ? "% Percentage" : "$ Fixed Amount"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={label}>Amount {adjustmentType === "PERCENTAGE" ? "(%)" : "(currency units)"}</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }}>
                {adjustmentType === "PERCENTAGE" ? "%" : "+"}
              </span>
              <input id="adjustment-value" type="number" min="0.01" step="0.01" style={{ ...inputSt, paddingLeft: 30 }} value={adjustmentValue} onChange={e => setAdjustmentValue(e.target.value)} placeholder="e.g. 10" />
            </div>
          </div>

          <div>
            <label style={label}>Reason <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({reason.length}/500)</span></label>
            <textarea id="bulk-reason" style={{ ...inputSt, minHeight: 80, resize: "vertical" }} value={reason} onChange={e => setReason(e.target.value)} placeholder="Minimum 10 characters…" maxLength={500} />
          </div>

          {/* Preview */}
          {val > 0 && (
            <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)" }}>
              {adjustmentType === "PERCENTAGE"
                ? `Each employee's salary will increase by ${val}%`
                : `Each employee's base salary will increase by ${val} (in their currency)`}
            </div>
          )}

          {error && <p style={{ color: "var(--destructive)", fontSize: 13 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={{ padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)" }} onClick={onClose}>Cancel</button>
            <button
              id="bulk-save-btn"
              style={{ ...btn, background: isValid && !mutation.isPending ? "var(--primary)" : "var(--surface-raised)", color: isValid && !mutation.isPending ? "#fff" : "var(--text-muted)" }}
              disabled={!isValid || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Updating…" : `Update ${count.toLocaleString()} Employees`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
