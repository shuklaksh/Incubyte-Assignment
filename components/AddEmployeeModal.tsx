"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { COUNTRY_FLAGS } from "@/lib/types";

interface DepartmentOption {
  id: string;
  name: string;
}

interface CountryOption {
  code: string;
  name: string;
  currency: string;
}

interface Props {
  departments: DepartmentOption[];
  countries: CountryOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEmployeeModal({ departments, countries, onClose, onSuccess }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [level, setLevel] = useState("L3");
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [countryCode, setCountryCode] = useState(countries[0]?.code ?? "");
  const [baseSalary, setBaseSalary] = useState("");
  const [bonus, setBonus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedCountry = countries.find(c => c.code === countryCode);
  const currencySymbol = selectedCountry?.currency ?? "";

  const isValid =
    fullName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    jobTitle.trim().length >= 2 &&
    departmentId !== "" &&
    countryCode !== "" &&
    Number(baseSalary) > 0 &&
    Number(bonus) >= 0;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          jobTitle: jobTitle.trim(),
          level,
          employmentType,
          departmentId,
          countryCode,
          baseSalary: Number(baseSalary),
          bonus: Number(bonus),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add employee");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Employee ${data.fullName} added successfully`);
      onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  };

  const modal: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    width: 520,
    maxWidth: "95vw",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: 28,
  };

  const label: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
  };

  const select: React.CSSProperties = {
    ...input,
    cursor: "pointer",
  };

  const btn: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal} className="slide-in-right">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Add New Employee</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Full Name & Email */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Full Name</label>
              <input
                id="add-fullname"
                type="text"
                style={input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label style={label}>Email</label>
              <input
                id="add-email"
                type="email"
                style={input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@acme.com"
              />
            </div>
          </div>

          {/* Job Title & Level */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Job Title</label>
              <input
                id="add-jobtitle"
                type="text"
                style={input}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div>
              <label style={label}>Level</label>
              <select
                id="add-level"
                style={select}
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                {["L1", "L2", "L3", "L4", "L5", "L6", "L7"].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Department & Country */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Department</label>
              <select
                id="add-department"
                style={select}
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="" disabled>Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Country</label>
              <select
                id="add-country"
                style={select}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                <option value="" disabled>Select Country</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {COUNTRY_FLAGS[c.code] ?? ""} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Employment Type */}
          <div>
            <label style={label}>Employment Type</label>
            <select
              id="add-employment-type"
              style={select}
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
            </select>
          </div>

          {/* Base Salary & Bonus */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Base Salary {currencySymbol && `(${currencySymbol})`}</label>
              <input
                id="add-base-salary"
                type="number"
                style={input}
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="e.g. 80000"
              />
            </div>
            <div>
              <label style={label}>Bonus {currencySymbol && `(${currencySymbol})`}</label>
              <input
                id="add-bonus"
                type="number"
                style={input}
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>
          </div>

          {error && <p style={{ color: "var(--destructive)", fontSize: 13, marginTop: 4 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button
              style={{ ...btn, background: "var(--surface-raised)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              id="save-employee-btn"
              style={{
                ...btn,
                background: isValid && !mutation.isPending ? "var(--primary)" : "var(--surface-raised)",
                color: isValid && !mutation.isPending ? "#fff" : "var(--text-muted)",
              }}
              disabled={!isValid || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Adding…" : "Add Employee"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
