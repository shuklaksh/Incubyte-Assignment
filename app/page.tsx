"use client";

import React, { Suspense } from "react";
import { EmployeeTable } from "@/components/EmployeeTable";

export default function Home() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>Loading employee list...</div>}>
      <EmployeeTable />
    </Suspense>
  );
}
