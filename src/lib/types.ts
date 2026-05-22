export type Genre = "techno" | "house" | "tech-house" | "trance" | "drum-and-bass" | "dubstep" | "disco" | "funk" | "hiphop" | "other";

export type EventStatus = "upcoming" | "today" | "happening_now" | "past";

export interface MusicEvent {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  venue_name: string;
  venue_address: string;
  lat: number;
  lng: number;
  city: string;
  starts_at: string;
  ends_at: string;
  genre: Genre;
  artists: string[];
  ticket_url?: string;
  price?: string;
  source_url?: string;
  scraped_at?: string;
  status: EventStatus;
  is_featured?: boolean;
}

export type AppView = "home" | "event-detail" | "search" | "about" | "cities" | "artists";
