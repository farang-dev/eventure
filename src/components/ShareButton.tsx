"use client";
import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  return (
    <button
      onClick={handleShare}
      style={{
        flex: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "10px 16px",
        background: copied ? "rgba(16,185,129,0.12)" : "var(--bg-elevated)",
        color: copied ? "var(--green)" : "var(--text-primary)",
        borderRadius: 10,
        border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "'Inter', sans-serif",
        transition: "all 0.15s",
      }}
    >
      {copied ? <Check size={14} /> : <Share2 size={14} />}
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
