"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Pencil } from "lucide-react";
import type { Employee } from "@/lib/types";
import { formatCurrency, formatDate, formatEmploymentType, calcTotalComp, calcDelta } from "@/lib/format";
import { COUNTRY_FLAGS } from "@/lib/types";

interface Props {
  employee: Employee;
  onClose: () => void;
  onEdit: () => void;
}

export function EmployeeDrawer({ employee, onClose, onEdit }: Props) {
  const { data: full } = useQuery({
    queryKey: ["employee", employee.id],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employee.id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json() as Promise<Employee>;
    },
  });

  const emp = full ?? employee;
  const base = parseFloat(emp.baseSalary);
  const bonus = parseFloat(emp.bonus);
  const total = calcTotalComp(base, bonus);

  const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 900, display: "flex", justifyContent: "flex-end" };
  const drawer: React.CSSProperties = { width: 480, maxWidth: "100vw", height: "100%", background: "var(--surface)", borderLeft: "1px solid var(--border)", overflowY: "auto", padding: 28, display: "flex", flexDirection: "column", gap: 20 };
  const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 };
  const valueSt: React.CSSProperties = { fontSize: 14, color: "var(--text-primary)" };
  const card: React.CSSProperties = { background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px" };
  const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={drawer} className="slide-in-right">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{emp.fullName}</h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{emp.jobTitle}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace", marginTop: 2 }}>{emp.employeeCode}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={20} /></button>
        </div>

        {/* Details Grid */}
        <div style={{ ...card, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
          {[
            ["Email", emp.email],
            ["Department", emp.department?.name ?? "—"],
            ["Country", `${COUNTRY_FLAGS[emp.countryCode] ?? ""} ${emp.country?.name ?? emp.countryCode}`],
            ["Level", emp.level],
            ["Type", formatEmploymentType(emp.employmentType)],
            ["Hired", formatDate(new Date(emp.hiredAt))],
          ].map(([l, v]) => (
            <div key={l}>
              <p style={labelSt}>{l}</p>
              <p style={valueSt}>{v}</p>
            </div>
          ))}
        </div>

        {/* Current Compensation */}
        <div style={card}>
          <p style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Current Compensation</p>
          <div style={row}>
            <div>
              <p style={labelSt}>Base Salary</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(base, emp.currency)}</p>
            </div>
            <div>
              <p style={labelSt}>Bonus</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text-secondary)" }}>{formatCurrency(bonus, emp.currency)}</p>
            </div>
            <div>
              <p style={labelSt}>Total Comp</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: "var(--success)" }}>{formatCurrency(total, emp.currency)}</p>
            </div>
          </div>
        </div>

        {/* Edit Button */}
        <button id="drawer-edit-btn" onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", alignSelf: "flex-start" }}>
          <Pencil size={15} /> Edit Salary
        </button>

        {/* Salary History */}
        <div>
          <p style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Salary History</p>
          {!full?.salaryHistory || full.salaryHistory.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No changes recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {full.salaryHistory.map(h => {
                const delta = calcDelta(parseFloat(h.oldSalary), parseFloat(h.newSalary));
                return (
                  <div key={h.id} style={{ ...card, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(new Date(h.changedAt))}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: delta.direction === "UP" ? "var(--success)" : "var(--destructive)" }}>
                        {delta.direction === "UP" ? "▲" : "▼"} {Math.abs(delta.percent)}%
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
                      {formatCurrency(parseFloat(h.oldSalary), emp.currency)} → {formatCurrency(parseFloat(h.newSalary), emp.currency)}
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{h.reason}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
