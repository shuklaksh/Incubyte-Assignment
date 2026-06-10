"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search, Download, RefreshCw, ChevronUp, ChevronDown,
  Pencil, Trash2, ChevronLeft, ChevronRight, X, AlertCircle, Plus
} from "lucide-react";
import type { Employee, EmployeeListResponse, EmployeeFilters } from "@/lib/types";
import { COUNTRY_FLAGS } from "@/lib/types";
import { formatCurrency, formatDate, calcTotalComp } from "@/lib/format";
import { EditSalaryModal } from "./EditSalaryModal";
import { BulkSalaryModal } from "./BulkSalaryModal";
import { DeleteModal } from "./DeleteModal";
import { EmployeeDrawer } from "./EmployeeDrawer";
import { AddEmployeeModal } from "./AddEmployeeModal";

const EMPLOYMENT_TYPE_BADGE: Record<string, { label: string; style: React.CSSProperties }> = {
  FULL_TIME: { label: "Full Time", style: { background: "var(--badge-blue)", color: "var(--badge-blue-text)" } },
  CONTRACT: { label: "Contract", style: { background: "var(--badge-orange)", color: "var(--badge-orange-text)" } },
  PART_TIME: { label: "Part Time", style: { background: "var(--badge-gray)", color: "var(--badge-gray-text)" } },
};

function buildParams(filters: EmployeeFilters): string {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) p.set(k, String(v));
  });
  return p.toString();
}

async function fetchEmployees(filters: EmployeeFilters): Promise<EmployeeListResponse> {
  const res = await fetch(`/api/employees?${buildParams(filters)}`);
  if (!res.ok) throw new Error("Failed to load employees");
  return res.json();
}

export function EmployeeTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Read filters from URL
  const filters: EmployeeFilters = useMemo(() => ({
    page: Number(searchParams.get("page") ?? 1),
    limit: 50,
    search: searchParams.get("search") ?? undefined,
    department: searchParams.get("department") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    employmentType: searchParams.get("employmentType") ?? undefined,
    level: searchParams.get("level") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") ?? "asc",
  }), [searchParams]);

  const updateFilters = useCallback((updates: Partial<EmployeeFilters>) => {
    const next = { ...filters, ...updates };
    if (updates.search !== undefined || updates.department !== undefined ||
      updates.country !== undefined || updates.employmentType !== undefined ||
      updates.level !== undefined) {
      next.page = 1;
    }
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== null && !(k === "page" && v === 1) && !(k === "limit")) {
        params.set(k, String(v));
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  }, [filters, pathname, router]);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (val: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => updateFilters({ search: val || undefined }), 300);
  };

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Employee | string[] | null>(null);
  const [drawerEmployee, setDrawerEmployee] = useState<Employee | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["employees", filters],
    queryFn: () => fetchEmployees(filters),
  });

  const employees = data?.data ?? [];
  const pagination = data?.pagination;
  const departments = data?.meta?.departments ?? [];
  const countries = data?.meta?.countries ?? [];
  const hasFilters = !!(filters.search || filters.department || filters.country || filters.employmentType || filters.level);

  // Sort handler
  const handleSort = (col: string) => {
    if (filters.sortBy === col) {
      updateFilters({ sortOrder: filters.sortOrder === "asc" ? "desc" : "asc" });
    } else {
      updateFilters({ sortBy: col, sortOrder: "asc" });
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (filters.sortBy !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return filters.sortOrder === "asc"
      ? <ChevronUp size={14} style={{ marginLeft: 4 }} />
      : <ChevronDown size={14} style={{ marginLeft: 4 }} />;
  };

  // Row selection
  const allPageSelected = employees.length > 0 && employees.every(e => selectedIds.has(e.id));
  const toggleAll = () => {
    if (allPageSelected) {
      const next = new Set(selectedIds);
      employees.forEach(e => next.delete(e.id));
      setSelectedIds(next);
      setSelectAll(false);
    } else {
      const next = new Set(selectedIds);
      employees.forEach(e => next.add(e.id));
      setSelectedIds(next);
    }
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) { next.delete(id); setSelectAll(false); }
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => { setSelectedIds(new Set()); setSelectAll(false); };

  // Export CSV
  const handleExport = () => {
    window.location.href = `/api/export/employees?${buildParams(filters)}`;
  };

  // Pagination pages
  const renderPages = () => {
    if (!pagination) return null;
    const { page, totalPages } = pagination;
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const s: Record<string, React.CSSProperties> = {
    container: { minHeight: "100vh", padding: "24px 32px", maxWidth: 1600, margin: "0 auto" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
    h1: { fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" },
    btn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", border: "1px solid var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)", transition: "all 0.15s" },
    btnPrimary: { background: "var(--primary)", border: "1px solid var(--primary)", color: "#fff" },
    btnDanger: { background: "var(--destructive-muted)", border: "1px solid var(--destructive)", color: "var(--destructive)" },
    filterBar: { display: "flex", flexDirection: "column" as const, gap: 12, marginBottom: 16 },
    filterRow: { display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "center" },
    input: { padding: "8px 12px 8px 36px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, width: 280, outline: "none" },
    select: { padding: "8px 12px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 14, cursor: "pointer", outline: "none" },
    bulkBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "var(--primary-muted)", border: "1px solid var(--primary)", borderRadius: 10, marginBottom: 12 },
    table: { width: "100%", borderCollapse: "collapse" as const },
    th: { padding: "10px 12px", textAlign: "left" as const, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" as const, cursor: "pointer" },
    thNoSort: { padding: "10px 12px", textAlign: "left" as const, fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" },
    td: { padding: "10px 12px", fontSize: 14, borderBottom: "1px solid var(--border-subtle)", color: "var(--text-primary)", verticalAlign: "middle" as const },
    row: { cursor: "pointer", transition: "background 0.1s" },
    badge: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "2px 8px", borderRadius: 99, fontSize: 12, fontWeight: 500, textAlign: "center" as const },
    pagination: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
    pageInfo: { fontSize: 14, color: "var(--text-secondary)" },
    pageBtn: { padding: "6px 10px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontSize: 13, cursor: "pointer", minWidth: 32, textAlign: "center" as const },
    pageBtnActive: { background: "var(--primary)", border: "1px solid var(--primary)", color: "#fff" },
    surface: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" },
    errorBanner: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--destructive-muted)", border: "1px solid var(--destructive)", borderRadius: 8, marginBottom: 12, color: "var(--destructive)" },
    emptyState: { textAlign: "center" as const, padding: "60px 20px", color: "var(--text-secondary)" },
    selectAllBanner: { display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", background: "var(--surface-raised)", borderBottom: "1px solid var(--border)", fontSize: 13 },
  };

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.h1}>Employee Salaries</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...s.btn, ...s.btnPrimary }} onClick={() => setAddOpen(true)} id="add-employee-btn">
            <Plus size={16} /> Add Employee
          </button>
          <button style={{ ...s.btn }} onClick={handleExport} id="export-csv-btn">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={s.filterBar}>
        <div style={s.filterRow}>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              id="search-input"
              placeholder="Search name or email…"
              defaultValue={filters.search ?? ""}
              onChange={e => handleSearch(e.target.value)}
              style={s.input}
            />
          </div>
          {hasFilters && (
            <button style={{ ...s.btn, fontSize: 13 }} onClick={() => router.push(pathname)} id="clear-filters-btn">
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>
        <div style={s.filterRow}>
          <select id="dept-filter" style={s.select} value={filters.department ?? ""} onChange={e => updateFilters({ department: e.target.value || undefined })}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select id="country-filter" style={s.select} value={filters.country ?? ""} onChange={e => updateFilters({ country: e.target.value || undefined })}>
            <option value="">All Countries</option>
            {countries.map(c => <option key={c.code} value={c.code}>{COUNTRY_FLAGS[c.code] ?? ""} {c.name}</option>)}
          </select>
          <select id="level-filter" style={s.select} value={filters.level ?? ""} onChange={e => updateFilters({ level: e.target.value || undefined })}>
            <option value="">All Levels</option>
            {["L1","L2","L3","L4","L5","L6","L7"].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select id="type-filter" style={s.select} value={filters.employmentType ?? ""} onChange={e => updateFilters({ employmentType: e.target.value || undefined })}>
            <option value="">All Types</option>
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div style={s.bulkBar} className="slide-down">
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {selectAll ? `All ${pagination?.total?.toLocaleString()} employees selected` : `${selectedIds.size} employee${selectedIds.size !== 1 ? "s" : ""} selected`}
            <button onClick={clearSelection} style={{ marginLeft: 12, fontSize: 12, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>Clear</button>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...s.btn }} onClick={() => setBulkModalOpen(true)} id="bulk-update-btn">Bulk Update Salary</button>
            <button style={{ ...s.btn, ...s.btnDanger }} onClick={() => setDeleteTarget(Array.from(selectedIds))} id="bulk-delete-btn">
              <Trash2 size={14} /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {isError && (
        <div style={s.errorBanner}>
          <AlertCircle size={16} />
          <span>Failed to load employees.</span>
          <button style={{ ...s.btn, padding: "4px 10px", fontSize: 13, marginLeft: "auto" }} onClick={() => refetch()}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div style={s.surface}>
        {/* Select-all banner */}
        {allPageSelected && !selectAll && (pagination?.total ?? 0) > employees.length && (
          <div style={s.selectAllBanner}>
            <span style={{ color: "var(--text-secondary)" }}>All {employees.length} employees on this page are selected.</span>
            <button style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500 }} onClick={() => setSelectAll(true)}>
              Select all {pagination?.total?.toLocaleString()} employees
            </button>
          </div>
        )}

        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.thNoSort}>
                <input type="checkbox" checked={allPageSelected} onChange={toggleAll} id="select-all-checkbox" style={{ cursor: "pointer" }} />
              </th>
              <th style={s.thNoSort}>Code</th>
              <th style={{ ...s.th }} onClick={() => handleSort("fullName")}>Name <SortIcon col="fullName" /></th>
              <th style={s.thNoSort}>Title</th>
              <th style={s.thNoSort}>Department</th>
              <th style={s.thNoSort}>Country</th>
              <th style={s.thNoSort}>Level</th>
              <th style={s.thNoSort}>Type</th>
              <th style={{ ...s.th }} onClick={() => handleSort("baseSalary")}>Salary <SortIcon col="baseSalary" /></th>
              <th style={s.thNoSort}>Bonus</th>
              <th style={s.thNoSort}>Total Comp</th>
              <th style={{ ...s.th }} onClick={() => handleSort("hiredAt")}>Hired <SortIcon col="hiredAt" /></th>
              <th style={s.thNoSort}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 13 }).map((_, j) => (
                    <td key={j} style={s.td}>
                      <div className="skeleton" style={{ height: 14, width: j === 0 ? 16 : j === 12 ? 60 : "80%" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={13} style={s.td}>
                  <div style={s.emptyState}>
                    <p style={{ fontSize: 16, marginBottom: 8 }}>No employees match your filters.</p>
                    {hasFilters && (
                      <button style={{ ...s.btn, margin: "0 auto" }} onClick={() => router.push(pathname)}>
                        <X size={14} /> Clear Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              employees.map(emp => {
                const base = parseFloat(emp.baseSalary);
                const bonus = parseFloat(emp.bonus);
                const total = calcTotalComp(base, bonus);
                const badge = EMPLOYMENT_TYPE_BADGE[emp.employmentType];
                const flag = COUNTRY_FLAGS[emp.countryCode] ?? "";
                const isSelected = selectedIds.has(emp.id);

                return (
                  <tr
                    key={emp.id}
                    style={{ ...s.row, background: isSelected ? "var(--primary-muted)" : "transparent" }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? "var(--primary-muted)" : "transparent"; }}
                    onClick={e => {
                      const t = e.target as HTMLElement;
                      if (t.tagName === "INPUT" || t.tagName === "BUTTON" || t.closest("button")) return;
                      setDrawerEmployee(emp);
                    }}
                  >
                    <td style={s.td} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(emp.id)} style={{ cursor: "pointer" }} />
                    </td>
                    <td style={{ ...s.td, color: "var(--text-muted)", fontFamily: "monospace", fontSize: 12 }}>{emp.employeeCode}</td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 500 }}>{emp.fullName}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{emp.email}</div>
                    </td>
                    <td style={{ ...s.td, color: "var(--text-secondary)", fontSize: 13 }}>{emp.jobTitle}</td>
                    <td style={{ ...s.td, color: "var(--text-secondary)" }}>{emp.department.name}</td>
                    <td style={s.td}>{flag} {emp.country.name}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: "var(--surface-raised)", border: "1px solid var(--border)", fontSize: 11 }}>{emp.level}</span>
                    </td>
                    <td style={s.td}>
                      {badge && <span style={{ ...s.badge, ...badge.style }}>{badge.label}</span>}
                    </td>
                    <td style={{ ...s.td, fontWeight: 500 }}>{formatCurrency(base, emp.currency)}</td>
                    <td style={{ ...s.td, color: "var(--text-secondary)" }}>{formatCurrency(bonus, emp.currency)}</td>
                    <td style={{ ...s.td, fontWeight: 600, color: "var(--success)" }}>{formatCurrency(total, emp.currency)}</td>
                    <td style={{ ...s.td, color: "var(--text-secondary)", fontSize: 13 }}>{formatDate(new Date(emp.hiredAt))}</td>
                    <td style={s.td} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          id={`edit-${emp.id}`}
                          title="Edit salary"
                          style={{ ...s.btn, padding: "5px 8px", fontSize: 12 }}
                          onClick={() => setEditEmployee(emp)}
                        ><Pencil size={13} /></button>
                        <button
                          id={`delete-${emp.id}`}
                          title="Delete employee"
                          style={{ ...s.btn, ...s.btnDanger, padding: "5px 8px", fontSize: 12 }}
                          onClick={() => setDeleteTarget(emp)}
                        ><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div style={s.pagination}>
          <span style={s.pageInfo}>
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} employees
          </span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button style={s.pageBtn} disabled={pagination.page <= 1} onClick={() => updateFilters({ page: pagination.page - 1 })}>
              <ChevronLeft size={14} />
            </button>
            {renderPages()?.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} style={{ padding: "6px 4px", color: "var(--text-muted)" }}>…</span>
              ) : (
                <button key={p} style={{ ...s.pageBtn, ...(p === pagination.page ? s.pageBtnActive : {}) }} onClick={() => updateFilters({ page: p as number })}>
                  {p}
                </button>
              )
            )}
            <button style={s.pageBtn} disabled={pagination.page >= pagination.totalPages} onClick={() => updateFilters({ page: pagination.page + 1 })}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modals & Drawer */}
      {editEmployee && (
        <EditSalaryModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSuccess={() => {
            setEditEmployee(null);
            queryClient.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}
      {bulkModalOpen && (
        <BulkSalaryModal
          selectedIds={selectAll ? [] : Array.from(selectedIds)}
          selectAll={selectAll}
          count={selectAll ? (pagination?.total ?? 0) : selectedIds.size}
          onClose={() => setBulkModalOpen(false)}
          onSuccess={() => {
            setBulkModalOpen(false);
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null);
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}
      {addOpen && (
        <AddEmployeeModal
          departments={departments}
          countries={countries}
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false);
            queryClient.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}
      {drawerEmployee && (
        <EmployeeDrawer
          employee={drawerEmployee}
          onClose={() => setDrawerEmployee(null)}
          onEdit={() => { setEditEmployee(drawerEmployee); setDrawerEmployee(null); }}
        />
      )}
    </div>
  );
}
