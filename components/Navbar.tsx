"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const s: Record<string, React.CSSProperties> = {
    nav: {
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    },
    container: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 64,
      padding: "0 32px",
      maxWidth: 1600,
      margin: "0 auto",
      position: "relative",
    },
    logo: {
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: "-0.5px",
      color: "var(--text-primary)",
      display: "flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      userSelect: "none",
    },
    navItems: {
      display: "flex",
      gap: 8,
      position: "absolute",
      left: "50%",
      transform: "translateX(-50%)",
    },
    rightSection: {
      width: 100, // Visual symmetry spacer
    },
  };

  return (
    <nav style={s.nav}>
      <div style={s.container}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={s.logo}>
            <span style={{ color: "var(--primary)" }}>✦</span> ACME
          </div>
        </Link>

        <div style={s.navItems}>
          <NavLink href="/dashboard" active={pathname === "/dashboard"} id="nav-dashboard">
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink href="/" active={pathname === "/"} id="nav-employees">
            <Users size={16} />
            Employee Table
          </NavLink>
        </div>

        <div style={s.rightSection} />
      </div>
    </nav>
  );
}

interface NavLinkProps {
  href: string;
  active: boolean;
  id?: string;
  children: React.ReactNode;
}

function NavLink({ href, active, id, children }: NavLinkProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    color: active ? "var(--text-primary)" : isHovered ? "var(--text-primary)" : "var(--text-secondary)",
    background: active ? "var(--surface-raised)" : isHovered ? "rgba(255, 255, 255, 0.03)" : "transparent",
    border: active ? "1px solid var(--border)" : "1px solid transparent",
    textDecoration: "none",
    transition: "all 0.15s ease",
  };

  return (
    <Link
      href={href}
      style={baseStyle}
      id={id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </Link>
  );
}
