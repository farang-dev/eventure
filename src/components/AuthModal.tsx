"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { X, Loader2 } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess?: () => void; // Optional if we redirect anyway
}

export default function AuthModal({ onClose }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    // signIn will automatically redirect to the OAuth screen
    await signIn("google", { callbackUrl: window.location.href });
  };

  return (
    <div className="overlay animate-fadein" style={{ zIndex: 300 }}>
      <div className="modal animate-slideup" style={{ maxWidth: 380, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Sign in to Eventure</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              You must be signed in to submit events
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          {/* Google Auth */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            style={{
              width: "100%", padding: "14px", borderRadius: 10,
              background: "#fff", color: "#000", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontSize: 15, fontWeight: 600, cursor: isLoading ? "not-allowed" : "pointer",
              transition: "opacity 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" color="#000" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
