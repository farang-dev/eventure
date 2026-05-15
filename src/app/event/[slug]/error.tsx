'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Event Page Error:", error);
  }, [error]);

  return (
    <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 400 }}>
        <div style={{ fontSize: 50, marginBottom: 20 }}>🚧</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Page Couldn't Load</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 30 }}>
          Sorry, something went wrong while loading this event. This might be due to a bad link or a temporary server issue.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}
          >
            <RefreshCcw size={16} /> Try Again
          </button>
          <Link
            href="/"
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', border: '1px solid var(--border)' }}
          >
            <Home size={16} /> Back to Map
          </Link>
        </div>
      </div>
    </div>
  );
}
