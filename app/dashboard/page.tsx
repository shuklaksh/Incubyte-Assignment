"use client";

import React, { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Briefcase
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { COUNTRY_FLAGS } from "@/lib/types";

interface CountryInfo {
  code: string;
  name: string;
  currency: string;
}

interface LevelInfo {
  level: string;
  count: number;
  avgSalary: number;
  minSalary: number;
  maxSalary: number;
}

interface DepartmentBudgetInfo {
  id: string;
  name: string;
  count: number;
  budget: number;
}

interface DashboardStatsResponse {
  stats: {
    totalPayroll: number;
    activeEmployees: number;
    avgBaseSalary: number;
  };
  countries: CountryInfo[];
  levels: LevelInfo[];
  departments: DepartmentBudgetInfo[];
}

const LEVEL_LIST = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"];

async function fetchDashboardStats(country?: string): Promise<DashboardStatsResponse> {
  const url = country
    ? `/api/dashboard/stats?country=${country}`
    : "/api/dashboard/stats";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load dashboard statistics");
  return res.json();
}

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const country = searchParams.get("country") ?? "";

  const updateCountry = (code: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (code) {
      params.set("country", code);
    } else {
      params.delete("country");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboardStats", country],
    queryFn: () => fetchDashboardStats(country),
  });

  const stats = data?.stats;
  const selectedCountryObj = data?.countries?.find(c => c.code === country);
  const currency = selectedCountryObj?.currency ?? "USD";

  // Reconcile standard L1-L7 levels list with database statistics response
  const levelsData = LEVEL_LIST.map((lvl) => {
    const match = data?.levels?.find((l) => l.level === lvl);
    return {
      level: lvl,
      count: match?.count ?? 0,
      avgSalary: match?.avgSalary ?? 0,
      minSalary: match?.minSalary ?? 0,
      maxSalary: match?.maxSalary ?? 0,
    };
  });

  const totalPayroll = stats?.totalPayroll ?? 0;

  const s: Record<string, React.CSSProperties> = {
    container: {
      minHeight: "calc(100vh - 64px)",
      padding: "32px 32px",
      maxWidth: 1600,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      gap: 24,
    },
    headerContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    },
    header: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    h1: {
      fontSize: 28,
      fontWeight: 700,
      color: "var(--text-primary)",
      letterSpacing: "-0.5px",
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    subtitle: {
      fontSize: 14,
      color: "var(--text-secondary)",
    },
    select: {
      padding: "8px 12px",
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      color: "var(--text-primary)",
      fontSize: 14,
      cursor: "pointer",
      outline: "none",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 20,
    },
    card: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      color: "var(--text-secondary)",
      fontSize: 14,
      fontWeight: 500,
    },
    cardValue: {
      fontSize: 28,
      fontWeight: 700,
      color: "var(--text-primary)",
    },
    chartSection: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
      gap: 20,
      marginTop: 8,
    },
    chartCard: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 24,
      minHeight: 320,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: 600,
      color: "var(--text-primary)",
    },
    errorText: {
      color: "var(--destructive)",
      fontSize: 14,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    levelList: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      marginTop: 8,
    },
    levelRow: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "10px 0",
      borderBottom: "1px solid var(--border-subtle)",
      flexWrap: "wrap",
    },
    levelBadge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px 10px",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
      minWidth: 40,
      textAlign: "center",
      color: "var(--text-primary)",
    },
    levelCount: {
      fontSize: 13,
      color: "var(--text-secondary)",
      width: 90,
    },
    sliderContainer: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: 12,
      minWidth: 240,
    },
    sliderLabel: {
      fontSize: 11,
      color: "var(--text-muted)",
      fontFamily: "monospace",
      width: 75,
    },
    sliderTrack: {
      flex: 1,
      height: 6,
      background: "var(--border-subtle)",
      borderRadius: 3,
      position: "relative",
    },
    sliderPointer: {
      position: "absolute",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "var(--primary)",
      boxShadow: "0 0 6px var(--primary)",
      cursor: "help",
      transition: "left 0.2s ease",
    },
    deptList: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      marginTop: 8,
    },
    deptRow: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "12px 0",
      borderBottom: "1px solid var(--border-subtle)",
    },
    deptHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    deptName: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--text-primary)",
    },
    deptMeta: {
      fontSize: 12,
      color: "var(--text-secondary)",
    },
    progressTrack: {
      height: 8,
      background: "var(--surface-raised)",
      border: "1px solid var(--border-subtle)",
      borderRadius: 4,
      overflow: "hidden",
      position: "relative",
    },
    progressFill: {
      height: "100%",
      background: "var(--primary)",
      borderRadius: 4,
      transition: "width 0.4s ease-out",
    },
  };

  return (
    <div style={s.container}>
      {/* Header Container */}
      <div style={s.headerContainer}>
        <div style={s.header}>
          <h1 style={s.h1}>
            <LayoutDashboard size={28} style={{ color: "var(--primary)" }} />
            Dashboard
          </h1>
          <p style={s.subtitle}>Overview and insights for ACME Salary Management.</p>
        </div>

        {/* Filters */}
        <select
          id="country-filter"
          style={s.select}
          value={country}
          onChange={e => updateCountry(e.target.value)}
        >
          <option value="">All Countries</option>
          {data?.countries?.map(c => (
            <option key={c.code} value={c.code}>
              {COUNTRY_FLAGS[c.code] ?? ""} {c.name}
            </option>
          ))}
        </select>
      </div>

      {isError && (
        <div style={s.errorText}>
          Failed to load dashboard data. Please try refreshing the page.
        </div>
      )}

      {/* KPI Cards */}
      <div style={s.grid}>
        {/* Card 1: Total Payroll */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span>Total Payroll</span>
            <DollarSign size={18} style={{ color: "var(--primary)" }} />
          </div>
          {isLoading ? (
            <div className="skeleton" style={{ height: 34, width: 160, marginTop: 4 }} />
          ) : (
            <div style={s.cardValue}>
              {formatCurrency(stats?.totalPayroll ?? 0, currency)}
            </div>
          )}
        </div>

        {/* Card 2: Active Employees */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span>Active Employees</span>
            <Users size={18} style={{ color: "var(--primary)" }} />
          </div>
          {isLoading ? (
            <div className="skeleton" style={{ height: 34, width: 100, marginTop: 4 }} />
          ) : (
            <div style={s.cardValue}>
              {(stats?.activeEmployees ?? 0).toLocaleString()}
            </div>
          )}
        </div>

        {/* Card 3: Avg Base Salary */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span>Avg. Base Salary</span>
            <Briefcase size={18} style={{ color: "var(--primary)" }} />
          </div>
          {isLoading ? (
            <div className="skeleton" style={{ height: 34, width: 140, marginTop: 4 }} />
          ) : (
            <div style={s.cardValue}>
              {formatCurrency(stats?.avgBaseSalary ?? 0, currency)}
            </div>
          )}
        </div>
      </div>

      {/* Charts & Interactive Trackers */}
      <div style={s.chartSection}>
        {/* Level Distribution & Equity Tracker */}
        <div style={s.chartCard}>
          <div style={s.chartTitle}>Level Distribution & Equity Tracker</div>
          
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
              {LEVEL_LIST.map((lvl) => (
                <div key={lvl} className="skeleton" style={{ height: 32, width: "100%" }} />
              ))}
            </div>
          ) : (
            <div style={s.levelList}>
              {levelsData.map(({ level, count, minSalary, maxSalary, avgSalary }) => {
                const range = maxSalary - minSalary;
                const avgPercent = range > 0 ? ((avgSalary - minSalary) / range) * 100 : 50;

                return (
                  <div key={level} style={s.levelRow}>
                    <div style={s.levelBadge}>{level}</div>
                    <div style={s.levelCount}>
                      {count} employee{count !== 1 ? "s" : ""}
                    </div>
                    
                    {count === 0 ? (
                      <div style={{ ...s.sliderContainer, opacity: 0.4 }}>
                        <div style={{ ...s.sliderTrack, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                            No active records
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={s.sliderContainer}>
                        <span style={{ ...s.sliderLabel, textAlign: "right" }}>
                          {formatCurrency(minSalary, currency)}
                        </span>
                        
                        <div style={s.sliderTrack}>
                          <div
                            style={{
                              ...s.sliderPointer,
                              left: `${avgPercent}%`,
                            }}
                            title={`Equity Range: ${formatCurrency(minSalary, currency)} – ${formatCurrency(maxSalary, currency)} (Average: ${formatCurrency(avgSalary, currency)})`}
                          />
                        </div>
                        
                        <span style={{ ...s.sliderLabel, textAlign: "left" }}>
                          {formatCurrency(maxSalary, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Department Budget Utilization */}
        <div style={s.chartCard}>
          <div style={s.chartTitle}>Department Budget Utilization</div>
          
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 44, width: "100%" }} />
              ))}
            </div>
          ) : (
            <div style={s.deptList}>
              {data?.departments?.map((dept) => {
                const percent = totalPayroll > 0 ? (dept.budget / totalPayroll) * 100 : 0;

                return (
                  <div key={dept.id} style={s.deptRow}>
                    <div style={s.deptHeader}>
                      <span style={s.deptName}>{dept.name}</span>
                      <span style={s.deptMeta}>
                        {formatCurrency(dept.budget, currency)} ({dept.count} employee{dept.count !== 1 ? "s" : ""})
                      </span>
                    </div>
                    
                    <div style={s.progressTrack}>
                      <div
                        style={{
                          ...s.progressFill,
                          width: `${percent}%`,
                        }}
                        title={`Utilizes ${percent.toFixed(1)}% of total payroll`}
                      />
                    </div>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        Loading dashboard...
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
