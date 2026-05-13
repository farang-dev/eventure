import os
import json
import requests
import time
import pytz
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

CITY_TIMEZONES = {
    "tokyo": "Asia/Tokyo",
    "london": "Europe/London",
    "vilnius": "Europe/Vilnius",
    "belgrade": "Europe/Belgrade"
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
                venue_location = venue.get("location")
                
                # Default coordinates (randomized city center) as fallback
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

                # Overwrite with actual RA coordinates if available
                if venue_location and venue_location.get("latitude") and venue_location.get("longitude"):
                    lat = float(venue_location["latitude"])
                    lng = float(venue_location["longitude"])
                
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
                
                starts_at_local = ev.get("startTime") or ev.get("date")
                ends_at_local = ev.get("endTime") or starts_at_local
                source_id = ev.get("id")
                
                # Handle Timezones: RA returns local time without offset
                # We convert it to UTC for storage
                try:
                    tz_name = CITY_TIMEZONES.get(city_name.lower(), "UTC")
                    tz = pytz.timezone(tz_name)
                    
                    # RA format: 2026-05-17T23:00:00.000 (might vary slightly)
                    # We strip the milliseconds if they exist for parsing
                    s_str = starts_at_local.split('.')[0]
                    e_str = ends_at_local.split('.')[0]
                    
                    s_dt = datetime.strptime(s_str, "%Y-%m-%dT%H:%M:%S")
                    e_dt = datetime.strptime(e_str, "%Y-%m-%dT%H:%M:%S")
                    
                    # Localize and convert to UTC
                    starts_at = tz.localize(s_dt).astimezone(pytz.UTC).isoformat().replace('+00:00', 'Z')
                    ends_at = tz.localize(e_dt).astimezone(pytz.UTC).isoformat().replace('+00:00', 'Z')
                except Exception as tz_err:
                    print(f"⚠️ Timezone conversion error for {title}: {tz_err}")
                    starts_at = starts_at_local
                    ends_at = ends_at_local

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
            # Attempt UPSERT (requires source_id column and unique constraint)
            headers["Prefer"] = "resolution=merge-duplicates"
            res = requests.post(f"{SUPABASE_URL}/rest/v1/music_events", json=event, headers=headers)
            
            if res.status_code == 400 and "source_id" in res.text:
                # Fallback: source_id column doesn't exist yet
                # We must remove it from the payload otherwise it will still fail
                headers.pop("Prefer", None)
                fallback_event = event.copy()
                fallback_event.pop("source_id", None)
                res = requests.post(f"{SUPABASE_URL}/rest/v1/music_events", json=fallback_event, headers=headers)

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

def clear_city_events(city_name):
    if not SUPABASE_URL or not SUPABASE_KEY: return
    
    print(f"\n[Refresh] Clearing all events for {city_name.upper()} to ensure accurate data...")
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        # Delete all events for this city
        res = requests.delete(f"{SUPABASE_URL}/rest/v1/music_events?city=eq.{city_name.lower()}", headers=headers)
        if res.status_code in [200, 204]:
            print(f"✅ Events for {city_name.upper()} cleared.")
        else:
            print(f"⚠️ Refresh returned status {res.status_code}")
    except Exception as e:
        print(f"❌ Error during refresh: {e}")

if __name__ == "__main__":
    print("--- Eventure Scraping Pipeline (2 Weeks) ---")
    
    # Cleanup first to save space
    cleanup_expired_events()
    
    cities = [
        {"name": "tokyo", "id": 27},
        {"name": "london", "id": 13},
        {"name": "vilnius", "id": 561},
        {"name": "belgrade", "id": 562},
    ]

    for city in cities:
        # Clear all events to ensure no duplicates or inaccurate locations remain
        clear_city_events(city["name"])
        
        events = fetch_ra_graphql(area_id=city["id"], city_name=city["name"], days_ahead=14)
        if events:
            insert_into_supabase(events)

    print("\nDone.")
