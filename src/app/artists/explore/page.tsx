import { Suspense } from "react";
import ExploreClient from "./ExploreClient";

export const metadata = {
  title: "Explore DJs | Eventure",
  description: "Discover DJ sets from cities around the world — 10 minutes each with seamless transitions.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const params = await searchParams;
  const city = params?.city || null;

  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff", fontSize: 14 }}>
        Loading Explore…
      </div>
    }>
      <ExploreClient initialCity={city} />
    </Suspense>
  );
}
