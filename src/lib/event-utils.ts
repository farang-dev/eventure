import { createClient } from "@supabase/supabase-js";
import type { MusicEvent } from "@/lib/types";
import { MOCK_EVENTS, CITY_TZS } from "@/lib/mock-data";
import { createSlug } from "@/lib/utils";
import { CITIES } from "./constants";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
let supabase: any = null;
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (e) {}

export const EVENT_CITIES = CITIES.map((c) => c.id);

export async function getEventBySlugOrId(slug: string): Promise<MusicEvent | null> {
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase();
  const mock = MOCK_EVENTS.find(e => e.id === slug || createSlug(e.title, e.city) === cleanSlug);
  if (mock) return mock;
  if (!supabase) return null;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug.replace(/[^\w-]/g, ''));
    if (isUuid) {
      const { data } = await supabase.from('music_events').select('*').eq('id', slug).single();
      if (data) return data as MusicEvent;
    }

    let matchedCity = "";
    for (const city of EVENT_CITIES) {
      if (cleanSlug.startsWith(city.toLowerCase() + "-")) {
        matchedCity = city;
        break;
      }
    }

    if (matchedCity) {
      const { data: cityEvents } = await supabase
        .from('music_events')
        .select('*')
        .eq('city', matchedCity);
      if (cityEvents) {
        const found = cityEvents.find((e: MusicEvent) => createSlug(e.title, e.city) === cleanSlug);
        if (found) return found as MusicEvent;
      }
    }

    const { data: recent } = await supabase.from('music_events').select('*').order('created_at', { ascending: false }).limit(1000);
    if (recent) {
      const found = recent.find((e: MusicEvent) => createSlug(e.title, e.city) === cleanSlug || e.id === slug);
      if (found) return found as MusicEvent;
    }
  } catch (err) {}
  return null;
}

export async function getRelatedEvents(event: MusicEvent): Promise<MusicEvent[]> {
  if (!event?.city || !supabase) return [];
  try {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("music_events")
      .select("*")
      .eq("city", event.city)
      .neq("id", event.id)
      .gte("ends_at", now)
      .or("is_approved.eq.true,is_approved.is.null")
      .order("starts_at", { ascending: true })
      .limit(30);
    
    if (data) {
      const seenTitles = new Set<string>();
      if (event.title) {
        seenTitles.add(event.title.toLowerCase().trim());
      }
      const filtered: MusicEvent[] = [];
      for (const item of (data as MusicEvent[])) {
        if (!item.title) continue;
        const titleKey = item.title.toLowerCase().trim();
        if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          filtered.push(item);
        }
        if (filtered.length >= 6) {
          break;
        }
      }
      return filtered;
    }
  } catch (e) {}
  return [];
}

export function formatEventDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

export function getSafeTimeLabel(startsAt: string, city?: string) {
  try {
    const d = new Date(startsAt);
    const tz = city ? CITY_TZS[city.toLowerCase()] : "UTC";
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
    const date = d.toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" });
    return { time, date };
  } catch (e) {
    const d = new Date(startsAt);
    return { time: d.toTimeString().slice(0, 5), date: d.toDateString() };
  }
}
