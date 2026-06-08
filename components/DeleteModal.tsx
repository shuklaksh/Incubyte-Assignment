"use client";

import React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, X } from "lucide-react";
import type { Employee } from "@/lib/types";

interface Props {
  target: Employee | string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteModal({ target, onClose, onSuccess }: Props) {
  const isBulk = Array.isArray(target);
  const count = isBulk ? target.length : 1;
  const name = !isBulk ? target.fullName : null;

  const mutation = useMutation({
    mutationFn: async () => {
      const ids = isBulk ? target : [target.id];
      await Promise.all(
        ids.map(id => fetch(`/api/employees/${id}`, { method: "DELETE" }).then(r => {
          if (!r.ok) throw new Error("Delete failed");
        }))
      );
    },
    onSuccess: () => {
      toast.success(isBulk ? `${count} employees removed` : `${name} removed`);
      onSuccess();
    },
    onError: () => toast.error("Failed to delete. Please try again."),
  });

  const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
  const modal: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, width: 420, maxWidth: "95vw", padding: 28 };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal} className="slide-in-right">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ padding: 10, background: "var(--destructive-muted)", borderRadius: 10, flexShrink: 0 }}>
              <AlertTriangle size={20} color="var(--destructive)" />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                {isBulk ? `Remove ${count} employees?` : `Remove ${name}?`}
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                This will mark the {count === 1 ? "employee" : "employees"} as inactive. Their data and salary history will be preserved.
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", flexShrink: 0 }}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            id="cancel-delete-btn"
            style={{ padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)" }}
            onClick={onClose}
          >Cancel</button>
          <button
            id="confirm-delete-btn"
            style={{ padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "1px solid var(--destructive)", background: "var(--destructive)", color: "#fff", opacity: mutation.isPending ? 0.7 : 1 }}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
