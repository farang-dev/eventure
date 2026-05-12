import os
import json
import requests
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

RA_GRAPHQL_URL = 'https://ra.co/graphql'
RA_HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def map_ra_genre(genre_name):
    if not genre_name: return "other"
    g = genre_name.lower()
    if any(x in g for x in ["tech house", "minimal"]): return "tech-house"
    if any(x in g for x in ["techno"]): return "techno"
    if any(x in g for x in ["house"]): return "house"
    if any(x in g for x in ["trance", "psytrance"]): return "trance"
    if any(x in g for x in ["hip-hop", "rap", "r&b"]): return "hiphop"
    if any(x in g for x in ["drum & bass", "drum and bass", "dnb", "jungle"]): return "drum-and-bass"
    if any(x in g for x in ["dubstep", "bass"]): return "dubstep"
    if any(x in g for x in ["disco"]): return "disco"
    if any(x in g for x in ["funk"]): return "funk"
    return "other"

def fetch_ra_graphql(area_id, city_name, days_ahead=14):
    print(f"\n[RA Scraper] Fetching {days_ahead} days of events for {city_name.upper()}...")
    
    start_date = datetime.now()
    end_date = start_date + timedelta(days=days_ahead)
    
    with open("scraper/graphql_query_template.json", "r") as file:
        payload = json.load(file)
        
    payload["variables"]["filters"]["areas"]["eq"] = area_id
    payload["variables"]["filters"]["listingDate"]["gte"] = start_date.strftime("%Y-%m-%dT00:00:00.000Z")
    payload["variables"]["filters"]["listingDate"]["lte"] = end_date.strftime("%Y-%m-%dT23:59:59.000Z")
    payload["variables"]["pageSize"] = 100
    
    headers = RA_HEADERS.copy()
    referer_map = {
        "london": "uk",
        "tokyo": "jp",
        "vilnius": "lt",
        "belgrade": "rs"
    }
    country_code = referer_map.get(city_name, "jp")
    headers["Referer"] = f"https://ra.co/events/{country_code}/{city_name}"

    all_parsed_events = []
    page = 1
    
    while True:
        payload["variables"]["page"] = page
        try:
            response = requests.post(RA_GRAPHQL_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            
            event_listings = data.get("data", {}).get("eventListings", {})
            events_data = event_listings.get("data", [])
            total_results = event_listings.get("totalResults", 0)
            
            if not events_data:
                break
                
            for e in events_data:
                ev = e.get("event", {})
                title = ev.get("title")
                if not title: continue
                
                venue = ev.get("venue", {})
                venue_name = venue.get("name", "TBA")
                
                import random
                if city_name == "tokyo":
                    lat_base, lng_base = 35.6580, 139.7016
                elif city_name == "vilnius":
                    lat_base, lng_base = 54.6872, 25.2797
                elif city_name == "belgrade":
                    lat_base, lng_base = 44.8125, 20.4612
                else:
                    lat_base, lng_base = 51.5074, -0.1278
                    
                lat = lat_base + random.uniform(-0.02, 0.02)
                lng = lng_base + random.uniform(-0.02, 0.02)
                
                images = ev.get("images", [])
                image_url = images[0].get("filename") if images else None
                
                artists = [a.get("name") for a in ev.get("artists", [])]
                content_url = ev.get("contentUrl")
                ra_url = f"https://ra.co{content_url}" if content_url else ""
                
                # Extract genre from RA event genres/tags
                genre_tags = ev.get("genres", []) or ev.get("tags", [])
                genre_name = genre_tags[0].get("name", "") if genre_tags else ""
                # Fallback: scan title for genre keywords
                if not genre_name:
                    title_lower = title.lower()
                    if any(x in title_lower for x in ["techno"]): genre_name = "techno"
                    elif any(x in title_lower for x in ["house"]): genre_name = "house"
                    elif any(x in title_lower for x in ["dnb", "drum", "jungle"]): genre_name = "dnb"
                    elif any(x in title_lower for x in ["trance"]): genre_name = "trance"
                    elif any(x in title_lower for x in ["disco"]): genre_name = "disco"
                genre = map_ra_genre(genre_name)
                
                starts_at = ev.get("startTime") or ev.get("date")
                ends_at = ev.get("endTime") or starts_at
                source_id = ev.get("id")
                
                all_parsed_events.append({
                    "source_id": source_id,
                    "title": title,
                    "description": title,
                    "image_url": image_url,
                    "genre": genre,
                    "artists": artists,
                    "venue_name": venue_name,
                    "venue_address": venue.get("name", ""),
                    "city": city_name.lower(),
                    "lat": lat,
                    "lng": lng,
                    "starts_at": starts_at,
                    "ends_at": ends_at,
                    "price": "Check RA",
                    "ticket_url": ra_url,
                    "source_url": ra_url,
                    "is_featured": ev.get("pick", None) is not None
                })
                
            if len(all_parsed_events) >= total_results:
                break
                
            page += 1
            time.sleep(1) # Be nice to RA API
            
        except Exception as e:
            print(f"❌ Error fetching {city_name} page {page}: {e}")
            break

    print(f"✅ Found {len(all_parsed_events)} events in {city_name.upper()}.")
    return all_parsed_events

def insert_into_supabase(events):
    if not events: return
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Supabase not configured. Skipping DB insert.")
        return
        
    print(f"Inserting {len(events)} events into Supabase...")
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    success_count = 0
    for event in events:
        try:
            # Use UPSERT via on_conflict on source_id
            # Prefer: resolution=merge-duplicates is the standard PostgREST way for upsert
            headers["Prefer"] = "resolution=merge-duplicates"
            res = requests.post(f"{SUPABASE_URL}/rest/v1/music_events", json=event, headers=headers)
            if res.status_code in [201, 204]:
                success_count += 1
            else:
                print(f"Failed to insert event {event.get('title')}: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"Error inserting event: {e}")
    print(f"🎉 Successfully inserted {success_count} / {len(events)} events!")

def cleanup_expired_events():
    if not SUPABASE_URL or not SUPABASE_KEY: return
    
    print("\n[Cleanup] Removing expired events (older than 48 hours)...")
    
    # Calculate cutoff (current time - 48 hours)
    cutoff = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        # Delete events where ends_at is less than the cutoff
        res = requests.delete(f"{SUPABASE_URL}/rest/v1/music_events?ends_at=lt.{cutoff}", headers=headers)
        if res.status_code in [200, 204]:
            print("✅ Expired events cleaned up successfully.")
        else:
            print(f"⚠️ Cleanup returned status {res.status_code}")
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")

if __name__ == "__main__":
    print("--- Eventure Scraping Pipeline (2 Weeks) ---")
    
    # Cleanup first to save space
    cleanup_expired_events()
    
    tokyo_events = fetch_ra_graphql(area_id=27, city_name="tokyo", days_ahead=14)
    if tokyo_events: insert_into_supabase(tokyo_events)
        
    london_events = fetch_ra_graphql(area_id=13, city_name="london", days_ahead=14)
    if london_events: insert_into_supabase(london_events)

    vilnius_events = fetch_ra_graphql(area_id=561, city_name="vilnius", days_ahead=14)
    if vilnius_events: insert_into_supabase(vilnius_events)
        
    belgrade_events = fetch_ra_graphql(area_id=562, city_name="belgrade", days_ahead=14)
    if belgrade_events: insert_into_supabase(belgrade_events)

    print("\nDone.")
