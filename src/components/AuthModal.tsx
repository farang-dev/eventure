"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { X, Mail, Lock, Loader2, ArrowRight } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: Props) {
  const [view, setView] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (view === "sign_in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else onSuccess();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else {
        // Success sign up
        alert("Check your email for the confirmation link!");
        onSuccess();
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="overlay animate-fadein" style={{ zIndex: 300 }}>
      <div className="modal animate-slideup" style={{ maxWidth: 380, padding: 0 }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              {view === "sign_in" ? "Sign in to Eventure" : "Create an account"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              {view === "sign_in" ? "You must be signed in to submit events" : "Join Eventure to submit events"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "10px 20px 24px" }}>
          {error && (
            <div style={{ padding: "10px 12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, marginBottom: 16 }}>
              <p style={{ color: "var(--primary)", fontSize: 12, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Google Auth */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            style={{
              width: "100%", padding: "12px", borderRadius: 10,
              background: "#fff", color: "#000", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontSize: 14, fontWeight: 600, cursor: isLoading ? "not-allowed" : "pointer",
              marginBottom: 16, transition: "opacity 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>or email</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  type="email"
                  required
                  placeholder="Email address"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <div className="input-with-icon">
                <Lock size={16} />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ padding: "12px", borderRadius: 10, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : (view === "sign_in" ? "Sign In" : "Sign Up")}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {view === "sign_in" ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => setView(view === "sign_in" ? "sign_up" : "sign_in")}
                style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, marginLeft: 6, cursor: "pointer" }}
              >
                {view === "sign_in" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
