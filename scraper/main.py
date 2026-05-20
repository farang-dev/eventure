import os
import json
import requests
import time
import pytz
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
if not os.environ.get("NEXT_PUBLIC_SUPABASE_URL"):
    load_dotenv(dotenv_path=".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

RA_GRAPHQL_URL = 'https://ra.co/graphql'
RA_HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

CITY_TIMEZONES = {
    "tokyo": "Asia/Tokyo",
    "osaka": "Asia/Tokyo",
    "london": "Europe/London",
    "vilnius": "Europe/Vilnius",
    "belgrade": "Europe/Belgrade",
    "tbilisi": "Asia/Tbilisi",
    "berlin": "Europe/Berlin",
    "new-york": "America/New_York",
    "amsterdam": "Europe/Amsterdam",
    "paris": "Europe/Paris",
    "barcelona": "Europe/Madrid"
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
        "osaka": "jp",
        "vilnius": "lt",
        "belgrade": "rs",
        "tbilisi": "ge",
        "berlin": "de",
        "new-york": "us",
        "amsterdam": "nl",
        "paris": "fr",
        "barcelona": "es"
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
                
                # Default coordinates (city center)
                if city_name == "tokyo":
                    lat_base, lng_base = 35.6580, 139.7016
                elif city_name == "osaka":
                    lat_base, lng_base = 34.6937, 135.5023
                elif city_name == "vilnius":
                    lat_base, lng_base = 54.6872, 25.2797
                elif city_name == "belgrade":
                    lat_base, lng_base = 44.8125, 20.4612
                elif city_name == "tbilisi":
                    lat_base, lng_base = 41.7151, 44.8271
                elif city_name == "berlin":
                    lat_base, lng_base = 52.5200, 13.4050
                elif city_name == "new-york":
                    lat_base, lng_base = 40.7128, -74.0060
                elif city_name == "amsterdam":
                    lat_base, lng_base = 52.3676, 4.9041
                elif city_name == "paris":
                    lat_base, lng_base = 48.8566, 2.3522
                elif city_name == "barcelona":
                    lat_base, lng_base = 41.3874, 2.1686
                else:
                    lat_base, lng_base = 51.5074, -0.1278
                
                lat, lng = lat_base, lng_base

                # --- Advanced Multi-Tier Validation Logic ---
                final_lat, final_lng = lat_base, lng_base
                ra_lat, ra_lng = None, None
                mb_lat, mb_lng = None, None

                CITY_RADIUS_KM = 50

                def km_from_city(lat, lng):
                    return ((lat - lat_base)**2 + (lng - lng_base)**2)**0.5 * 111

                # 1. Get RA native coordinates if they exist
                if venue_location and venue_location.get("latitude") and venue_location.get("longitude"):
                    raw_ra_lat = float(venue_location["latitude"])
                    raw_ra_lng = float(venue_location["longitude"])
                    if km_from_city(raw_ra_lat, raw_ra_lng) < CITY_RADIUS_KM:
                        ra_lat, ra_lng = raw_ra_lat, raw_ra_lng
                    else:
                        print(f"  🗑️ Discarded RA coordinates for {venue_name}: {raw_ra_lat},{raw_ra_lng} ({km_from_city(raw_ra_lat, raw_ra_lng):.0f}km from {city_name})")

                # 2. Get Mapbox geocoded coordinates using full address
                if venue_name != "TBA":
                    try:
                        exact_address = venue.get("address") or venue_location.get("address")
                        search_query = f"{venue_name}, {exact_address}, {city_name}" if exact_address else f"{venue_name}, {city_name}"
                        mapbox_token = os.environ.get("NEXT_PUBLIC_MAPBOX_TOKEN") or os.environ.get("MAPBOX_TOKEN")
                        
                        if mapbox_token:
                            geo_res = requests.get(
                                f"https://api.mapbox.com/geocoding/v5/mapbox.places/{requests.utils.quote(search_query)}.json",
                                params={"access_token": mapbox_token, "limit": 1, "proximity": f"{lng_base},{lat_base}"}
                            )
                            geo_data = geo_res.json()
                            if geo_data.get("features"):
                                feat = geo_data["features"][0]
                                center = feat["center"]
                                m_lat, m_lng = center[1], center[0]
                                m_types = feat.get("place_type", [])
                                
                                # Accept Mapbox if it found a specific POI/address AND within 20km of city
                                if any(t in ["poi", "address"] for t in m_types) and km_from_city(m_lat, m_lng) < 20:
                                    mb_lat, mb_lng = m_lat, m_lng
                                # If RA had no valid coords, also accept 'place' type results within city
                                elif not ra_lat and any(t in ["poi", "address", "place", "neighborhood"] for t in m_types) and km_from_city(m_lat, m_lng) < CITY_RADIUS_KM:
                                    mb_lat, mb_lng = m_lat, m_lng
                    except Exception as geo_err:
                        print(f"  ❌ Geocoding error: {geo_err}")

                # 3. Multi-Tier Decision Logic
                if ra_lat and mb_lat:
                    gap = ((ra_lat - mb_lat)**2 + (ra_lng - mb_lng)**2)**0.5 * 111
                    # If RA and Mapbox disagree significantly (300m+) but both in same city,
                    # prefer Mapbox (more precise geocoding)
                    if gap > 0.3 and km_from_city(mb_lat, mb_lng) < 10:
                        print(f"  📍 Corrected {venue_name}: Moved {gap:.1f}km from RA to Mapbox.")
                        final_lat, final_lng = mb_lat, mb_lng
                    else:
                        final_lat, final_lng = ra_lat, ra_lng
                elif ra_lat:
                    final_lat, final_lng = ra_lat, ra_lng
                elif mb_lat:
                    final_lat, final_lng = mb_lat, mb_lng
                else:
                    print(f"  ⚠️ No valid coordinates for {venue_name}. Using city center.")

                lat, lng = final_lat, final_lng
                
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
                    
                    # Cap event duration to prevent long/repeating events from staying "Live" forever
                    duration = e_dt - s_dt
                    is_festival = any(x in title.lower() for x in ["festival", "fest", "weekend", "camp", "weeker", "starfestival"])
                    max_duration = timedelta(hours=48) if is_festival else timedelta(hours=20)
                    if duration > max_duration or duration < timedelta(0):
                        e_dt = s_dt + (timedelta(hours=30) if is_festival else timedelta(hours=8))
                    
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
                    "venue_address": venue.get("address") or venue_location.get("address") or venue_name,
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
    
    print("\n[Cleanup] Removing expired events (older than 3 hours)...")
    
    # Calculate cutoff (current time - 3 hours)
    cutoff = (datetime.now() - timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    
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
        {"name": "osaka", "id": 66},
        {"name": "london", "id": 13},
        {"name": "vilnius", "id": 561},
        {"name": "belgrade", "id": 562},
        {"name": "tbilisi", "id": 188},
        {"name": "berlin", "id": 34},
        {"name": "new-york", "id": 8},
        {"name": "amsterdam", "id": 29},
        {"name": "paris", "id": 44},
        {"name": "barcelona", "id": 20},
    ]

    for city in cities:
        # Clear all events to ensure no duplicates or inaccurate locations remain
        clear_city_events(city["name"])
        
        events = fetch_ra_graphql(area_id=city["id"], city_name=city["name"], days_ahead=14)
        if events:
            insert_into_supabase(events)

    # Run cleanup one last time to remove any events whose capped ends_at are in the past
    cleanup_expired_events()
    print("\nDone.")
