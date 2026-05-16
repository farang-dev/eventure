import { createClient } from "@supabase/supabase-js";
import HomePageClient from "./HomePageClient";
import type { MusicEvent } from "@/lib/types";

export const revalidate = 60;

export default async function Page() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  let initialEvents: MusicEvent[] = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("music_events")
        .select("*")
        .gte("ends_at", now)
        .or("is_approved.eq.true,is_approved.is.null")
        .order("starts_at", { ascending: true })
        .limit(1000);
      if (data) {
        initialEvents = data as MusicEvent[];
      }
    } catch (e) {
      console.error("Failed to fetch initial events:", e);
    }
  }

  return <HomePageClient initialEvents={initialEvents} />;
}
