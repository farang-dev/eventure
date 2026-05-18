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
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "8px 14px",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        color: "var(--text-primary)",
        fontSize: 14,
      }}
    >
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
