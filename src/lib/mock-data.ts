import type { MusicEvent, Genre } from "./types";
export type GenreIconName = "SlidersHorizontal" | "Disc3" | "Speaker" | "Radio" | "Activity" | "Zap" | "Sparkles" | "Flame" | "Mic2" | "Music";

const now = new Date();
const inHours = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();
const inDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

function getStatus(startsAt: string, endsAt: string): MusicEvent["status"] {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const nowMs = Date.now();
  if (nowMs >= start.getTime() && nowMs <= end.getTime()) return "happening_now";
  const today = new Date(); today.setHours(23, 59, 59, 999);
  if (start <= today && start.getTime() > nowMs) return "today";
  if (start.getTime() > nowMs) return "upcoming";
  return "past";
}

const rawEvents: Omit<MusicEvent, "status">[] = [
  {
    id: "e1",
    title: "WOMB NIGHT: TECHNO UNDERGROUND",
    description:
      "渋谷のクラブ文化を代表するWOMBが贈るテクノナイト。地下のメインフロアでは深夜から夜明けまでハードなビートが鳴り響く。",
    image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format",
    venue_name: "WOMB",
    venue_address: "2-16 Maruyamacho, Shibuya",
    lat: 35.6588,
    lng: 139.6975,
    city: "東京",
    starts_at: inHours(-1),
    ends_at: inHours(4),
    genre: "techno",
    artists: ["Paula Temple", "DJ Stingray 313", "PHYSICAL THERAPY"],
    ticket_url: "https://www.womb.co.jp",
    price: "¥3,000",
    source_url: "https://ra.co/events/tokyo",
    is_featured: true,
  },
  {
    id: "e2",
    title: "LIQUIDROOM PRESENTS: HOUSE SESSIONS",
    description:
      "恵比寿LIQUIDROOMでのハウスミュージックナイト。シカゴ・ハウスからディープハウスまで、ルーツに忠実なセットが展開される。",
    image_url: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&auto=format",
    venue_name: "LIQUIDROOM",
    venue_address: "3-16-6 Higashiazabu, Ebisu",
    lat: 35.6470,
    lng: 139.7097,
    city: "東京",
    starts_at: inHours(1),
    ends_at: inHours(7),
    genre: "house",
    artists: ["Honey Dijon", "DJ NOBU", "Kan Sano"],
    ticket_url: "https://www.liquidroom.net",
    price: "¥3,500",
    source_url: "https://ra.co/events/tokyo",
    is_featured: true,
  },
  {
    id: "e3",
    title: "AgeHa RAVE: DRUM & BASS JUNGLE",
    description:
      "新木場ageHaの巨大なメインフロアがドラムンベースとジャングルに染まる一夜。東京最大のクラブシーンを体感せよ。",
    image_url: "https://images.unsplash.com/photo-1598387846148-47e82ee120cc?w=800&auto=format",
    venue_name: "ageHa",
    venue_address: "2-2-10 Shinkiba, Koto-ku",
    lat: 35.6352,
    lng: 139.8292,
    city: "東京",
    starts_at: inHours(3),
    ends_at: inHours(10),
    genre: "drum-and-bass",
    artists: ["Chase & Status", "Shy FX", "DJ Hype", "LTJ Bukem"],
    ticket_url: "https://www.ageha.com",
    price: "¥4,000",
    source_url: "https://ra.co/events/tokyo",
  },
  {
    id: "e4",
    title: "UNIT TOKYO: EXPERIMENTAL NIGHT",
    description:
      "代官山UNITが贈るエクスペリメンタル・エレクトロニクスの夜。境界を溶かす音響体験。",
    image_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format",
    venue_name: "UNIT",
    venue_address: "1-34-17 Daikanyamacho, Shibuya",
    lat: 35.6487,
    lng: 139.7011,
    city: "東京",
    starts_at: inDays(1),
    ends_at: new Date(new Date(inDays(1)).getTime() + 6 * 3600000).toISOString(),
    genre: "dubstep",
    artists: ["Actress", "Lorenzo Senni", "Errorsmith"],
    ticket_url: "https://www.unit-tokyo.com",
    price: "¥2,500",
    source_url: "https://ra.co/events/tokyo",
  },
  {
    id: "e5",
    title: "Blue Note Tokyo: JAZZ NIGHT",
    description:
      "世界的に有名なBlue Note Tokyoでの特別なジャズセッション。南青山の夜をメロディックなハーモニーで満たす。",
    image_url: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&auto=format",
    venue_name: "Blue Note Tokyo",
    venue_address: "6-3-16 Minami-Aoyama, Minato-ku",
    lat: 35.6673,
    lng: 139.7194,
    city: "東京",
    starts_at: inHours(2),
    ends_at: inHours(5),
    genre: "tech-house",
    artists: ["Kamasi Washington", "Makaya McCraven"],
    ticket_url: "https://www.bluenote.co.jp",
    price: "¥8,800",
    source_url: "https://ra.co/events/tokyo",
    is_featured: true,
  },
  {
    id: "e6",
    title: "Shibuya WWW: HIP-HOP ALL NIGHT",
    description:
      "渋谷WWWでのヒップホップオールナイト。ジャパニーズヒップホップから最新の海外アクトまでを網羅。",
    image_url: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format",
    venue_name: "WWW X",
    venue_address: "13-17 Udagawacho, Shibuya",
    lat: 35.6608,
    lng: 139.6982,
    city: "東京",
    starts_at: inDays(2),
    ends_at: new Date(new Date(inDays(2)).getTime() + 5 * 3600000).toISOString(),
    genre: "hiphop",
    artists: ["KOHH", "Shing02", "ISSUGI"],
    ticket_url: "https://www-shibuya.jp",
    price: "¥2,000",
    source_url: "https://ra.co/events/tokyo",
  },
  {
    id: "e7",
    title: "Contact Tokyo: AMBIENT WORKS",
    description:
      "渋谷Contactのディープなアンビエントセット。完全暗室、ソラウンドサウンドで贈る没入型音楽体験。",
    image_url: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format",
    venue_name: "Contact",
    venue_address: "B2F 2-10-12 Dogenzaka, Shibuya",
    lat: 35.6572,
    lng: 139.6979,
    city: "東京",
    starts_at: inDays(3),
    ends_at: new Date(new Date(inDays(3)).getTime() + 7 * 3600000).toISOString(),
    genre: "trance",
    artists: ["Burial (rare live)", "The Caretaker", "Tim Hecker"],
    ticket_url: "https://www.contacttokyo.com",
    price: "¥3,000",
    source_url: "https://ra.co/events/tokyo",
  },
  {
    id: "e8",
    title: "Circus Tokyo: ALL NIGHT TECHNO",
    description:
      "大阪発の人気クラブCircusが東京に上陸。深夜から朝まで続くハードテクノパーティ。",
    image_url: "https://images.unsplash.com/photo-1619229666372-3c26c399a4dd?w=800&auto=format",
    venue_name: "Circus Tokyo",
    venue_address: "B1F 1-16-3 Dogenzaka, Shibuya",
    lat: 35.6578,
    lng: 139.6990,
    city: "東京",
    starts_at: inDays(5),
    ends_at: new Date(new Date(inDays(5)).getTime() + 8 * 3600000).toISOString(),
    genre: "techno",
    artists: ["Surgeon", "Blawan", "Paula Temple"],
    ticket_url: "https://circus-tokyo.jp",
    price: "¥3,500",
    source_url: "https://ra.co/events/tokyo",
  },
  {
    id: "e9",
    title: "Oath Tokyo: DEEP HOUSE NIGHT",
    description:
      "六本木のOathでディープハウスに特化したナイト。洗練された音響システムとともにデープなグルーヴを体感。",
    image_url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&auto=format",
    venue_name: "Oath",
    venue_address: "B1F 6-7-11 Roppongi, Minato-ku",
    lat: 35.6630,
    lng: 139.7308,
    city: "東京",
    starts_at: inHours(5),
    ends_at: inHours(11),
    genre: "house",
    artists: ["Larry Heard", "Mr. G", "Kerri Chandler"],
    ticket_url: "https://oath.tokyo",
    price: "¥4,000",
    source_url: "https://ra.co/events/tokyo",
  },
  {
    id: "e10",
    title: "EDM TOKYO: STUDIO COAST FINALE",
    description:
      "新木場Studio Coastでの大型EDMイベント。東京の電子音楽シーンを代表するビッグネームが集結。",
    image_url: "https://images.unsplash.com/photo-1563841930606-67e2bce48b78?w=800&auto=format",
    venue_name: "Studio Coast (ZeppDiver City)",
    venue_address: "2-2-3 Shinkiba, Koto-ku",
    lat: 35.6341,
    lng: 139.8280,
    city: "東京",
    starts_at: inDays(7),
    ends_at: new Date(new Date(inDays(7)).getTime() + 6 * 3600000).toISOString(),
    genre: "techno",
    artists: ["Nina Kraviz", "Ben Klock", "Amelie Lens"],
    ticket_url: "https://www.zepp.co.jp",
    price: "¥5,000",
    source_url: "https://ra.co/events/tokyo",
    is_featured: true,
  },
];

export const MOCK_EVENTS: MusicEvent[] = rawEvents.map((e) => ({
  ...e,
  status: getStatus(e.starts_at, e.ends_at),
}));

export const GENRE_META: Record<
  string,
  { label: string; icon: GenreIconName; color: string; bg: string }
> = {
  techno:          { label: "Techno",       icon: "SlidersHorizontal", color: "#E63946", bg: "rgba(230,57,70,0.12)" },
  house:           { label: "House",        icon: "Disc3",             color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  "tech-house":    { label: "Tech House",   icon: "Speaker",           color: "#06B6D4", bg: "rgba(6,182,212,0.12)" },
  trance:          { label: "Trance",       icon: "Radio",             color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  "drum-and-bass": { label: "D&B",          icon: "Activity",          color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  dubstep:         { label: "Dubstep",      icon: "Zap",               color: "#EC4899", bg: "rgba(236,72,153,0.12)" },
  disco:           { label: "Disco",        icon: "Sparkles",          color: "#D946EF", bg: "rgba(217,70,239,0.12)" },
  funk:            { label: "Funk",         icon: "Flame",             color: "#EAB308", bg: "rgba(234,179,8,0.12)" },
  hiphop:          { label: "Hip-Hop",      icon: "Mic2",              color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  other:           { label: "Other",        icon: "Music",             color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
};

export const CITY_TZS: Record<string, string> = {
  tokyo: "Asia/Tokyo",
  london: "Europe/London",
  vilnius: "Europe/Vilnius",
  belgrade: "Europe/Belgrade",
  東京: "Asia/Tokyo",
};

export function formatEventTime(startsAt: string, city?: string): string {
  const d = new Date(startsAt);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = getDaysUntil(startsAt);
  
  const tz = city ? CITY_TZS[city.toLowerCase()] : undefined;
  const timeStr = d.toLocaleTimeString("en-GB", { 
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: false,
    timeZone: tz
  });

  if (diffMs < 0 && Math.abs(diffMs) < 3600000 * 6) return "🔴 LIVE NOW";
  if (diffMs < 0) return "Ended";
  if (diffDays === 0) return `Today ${timeStr}`;
  if (diffDays === 1) return `Tomorrow ${timeStr}`;
  if (diffDays < 7) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // Note: getDay() uses local time, but for the day name it's usually acceptable. 
    // For perfect accuracy we could use Intl.DateTimeFormat for the weekday too.
    const dayName = new Intl.DateTimeFormat("en-US", { weekday: 'short', timeZone: tz }).format(d);
    return `${dayName} ${timeStr}`;
  }
  const datePart = new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric", timeZone: tz }).format(d);
  return `${datePart} ${timeStr}`;
}

export function getDaysUntil(startsAt: string): number {
  const start = new Date(startsAt);
  const now = new Date();
  // Compare calendar dates, not raw ms — so midnight events count as "tomorrow"
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((startDay.getTime() - nowDay.getTime()) / 86400000);
}
