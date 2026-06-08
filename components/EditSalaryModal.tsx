"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { Employee } from "@/lib/types";
import { formatCurrency, calcTotalComp, calcDelta } from "@/lib/format";

interface Props {
  employee: Employee;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditSalaryModal({ employee, onClose, onSuccess }: Props) {
  const base = parseFloat(employee.baseSalary);
  const bonus = parseFloat(employee.bonus);

  const [newBase, setNewBase] = useState(base);
  const [newBonus, setNewBonus] = useState(bonus);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const delta = calcDelta(calcTotalComp(base, bonus), calcTotalComp(newBase, newBonus));
  const isValid = newBase > 0 && newBonus >= 0 && reason.length >= 10;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/employees/${employee.id}/salary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseSalary: newBase, bonus: newBonus, reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Salary updated for ${employee.fullName}`);
      onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
  const modal: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, width: 480, maxWidth: "95vw", padding: 28 };
  const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" };
  const input: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, outline: "none" };
  const btn: React.CSSProperties = { padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none" };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal} className="slide-in-right">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Edit Salary — {employee.fullName}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={label}>Base Salary ({employee.currency})</label>
            <input id="edit-base-salary" type="number" style={input} value={newBase} onChange={e => setNewBase(Number(e.target.value))} />
          </div>
          <div>
            <label style={label}>Bonus ({employee.currency})</label>
            <input id="edit-bonus" type="number" style={input} value={newBonus} onChange={e => setNewBonus(Number(e.target.value))} />
          </div>
          <div>
            <label style={label}>Reason <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({reason.length}/500)</span></label>
            <textarea
              id="edit-reason"
              style={{ ...input, minHeight: 80, resize: "vertical" }}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Minimum 10 characters…"
              maxLength={500}
            />
          </div>

          {/* Live preview */}
          <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10, fontWeight: 600 }}>PREVIEW</p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span style={{ color: "var(--text-secondary)" }}>Current total: <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(calcTotalComp(base, bonus), employee.currency)}</strong></span>
              <span style={{ color: "var(--text-secondary)" }}>New total: <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(calcTotalComp(newBase, newBonus), employee.currency)}</strong></span>
            </div>
            {delta.direction !== "NONE" && (
              <div style={{ marginTop: 8, fontSize: 14, color: delta.direction === "UP" ? "var(--success)" : "var(--destructive)", fontWeight: 500 }}>
                {delta.direction === "UP" ? "▲" : "▼"} {formatCurrency(Math.abs(delta.amount), employee.currency)} ({Math.abs(delta.percent)}%)
              </div>
            )}
          </div>

          {error && <p style={{ color: "var(--destructive)", fontSize: 13 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={{ ...btn, background: "var(--surface-raised)", color: "var(--text-primary)", border: "1px solid var(--border)" }} onClick={onClose}>Cancel</button>
            <button
              id="save-salary-btn"
              style={{ ...btn, background: isValid && !mutation.isPending ? "var(--primary)" : "var(--surface-raised)", color: isValid && !mutation.isPending ? "#fff" : "var(--text-muted)" }}
              disabled={!isValid || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
