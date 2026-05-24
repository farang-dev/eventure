import { NextResponse } from "next/server";

export async function GET() {
  const sitemapUrl = "https://www.eventurer.online/sitemap.xml";
  const googlePing = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
  const bingPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;

  const results: { google?: string; bing?: string } = {};

  try {
    const res = await fetch(googlePing, { signal: AbortSignal.timeout(10000) });
    results.google = `Google responded with ${res.status}`;
  } catch (e: any) {
    results.google = `Google ping failed: ${e?.message || "unknown"}`;
  }

  try {
    const res = await fetch(bingPing, { signal: AbortSignal.timeout(10000) });
    results.bing = `Bing responded with ${res.status}`;
  } catch (e: any) {
    results.bing = `Bing ping failed: ${e?.message || "unknown"}`;
  }

  return NextResponse.json({
    ok: true,
    sitemap: sitemapUrl,
    results,
    hint: "Call this endpoint after adding a new city to ensure search engines discover it promptly.",
  });
}
