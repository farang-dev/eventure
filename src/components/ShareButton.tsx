"use client";
import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface Props {
  url: string;
}

export default function ShareButton({ url }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <button
      onClick={handleShare}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        padding: "14px 20px",
        background: copied ? "var(--green)" : "var(--primary)",
        border: "none",
        borderRadius: 12,
        cursor: "pointer",
        color: "#fff",
        fontSize: 14,
        fontWeight: 800,
        width: "100%",
        marginTop: 14,
        fontFamily: "'Poppins', sans-serif",
        textTransform: "uppercase",
        transition: "all 0.2s ease"
      }}
    >
      {copied ? <Check size={16} strokeWidth={3} /> : <Share2 size={16} strokeWidth={3} />}
      {copied ? "Link Copied!" : "Share Event Link"}
    </button>
  );
}
