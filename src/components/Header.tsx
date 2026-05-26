"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Map as MapIcon, Building2, Users, Menu, X, MapPin } from "lucide-react";

interface HeaderProps {
  activePage?: "map" | "cities" | "artists" | "venues";
}

const navLinks = [
  { id: "map" as const, href: "/", label: "Map", icon: <MapIcon size={16} /> },
  { id: "cities" as const, href: "/events/cities", label: "Cities", icon: <Building2 size={16} /> },
  { id: "artists" as const, href: "/artists", label: "Artists", icon: <Users size={16} /> },
  { id: "venues" as const, href: "/venues", label: "Venues", icon: <MapPin size={16} /> },
];

export default function Header({ activePage }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  return (
    <>
      <header style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-secondary)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg, var(--primary), var(--purple))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'Poppins', sans-serif" }}>
              Eventure ⚡️
            </span>
          </Link>

          {/* Desktop nav */}
          {!isMobile && (
            <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {navLinks.map((link) => {
                const isActive = activePage === link.id;
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    style={{
                      color: isActive ? "var(--primary)" : "var(--text-secondary)",
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Mobile hamburger */}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", padding: 4 }}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
        </div>
      </header>

      {/* Mobile menu overlay — rendered outside header to avoid backdrop-filter stacking issues */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            top: 57,
            background: "var(--bg-secondary)",
            borderTop: "1px solid var(--border)",
            zIndex: 99,
            display: "flex",
            flexDirection: "column",
            padding: "16px 20px",
            gap: 8,
            animation: "fadeIn 0.15s ease",
          }}
        >
          {navLinks.map((link) => {
            const isActive = activePage === link.id;
            return (
              <Link
                key={link.id}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  color: isActive ? "var(--primary)" : "var(--text-primary)",
                  textDecoration: "none",
                  fontSize: 16,
                  fontWeight: isActive ? 800 : 600,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: isActive ? "rgba(124,58,237,0.08)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "background 0.15s",
                }}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
