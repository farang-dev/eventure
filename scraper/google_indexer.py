import os
import sys
import json
import re
import time
import urllib.parse
import requests
from datetime import datetime
from dotenv import load_dotenv

# Add parent directory or local scraper folder to path if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load env variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

INDEXED_LOG_FILE = os.path.join(os.path.dirname(__file__), "indexed_urls.txt")

WHATSAPP_PHONE = os.environ.get("WHATSAPP_PHONE") or "818041185473"
WHATSAPP_API_KEY = os.environ.get("WHATSAPP_API_KEY") or "2645005"

def create_slug(title, city):
    """Helper to match Next.js createSlug logic: returns '{city}-{title}' slug"""
    if not title:
        return ""
    city = city or "various"
    clean = f"{city}-{title}".lower()
    clean = re.sub(r'[^\w\s-]', '', clean)
    clean = re.sub(r'[\s_]+', '-', clean)
    return clean.strip('-')

def create_event_url(title, city):
    """Matches Next.js createEventUrl exactly: /events/{city}/{title-slug}"""
    city = (city or "various").lower().replace(' ', '-')
    full_slug = create_slug(title, city)
    # Strip city prefix to get title-only slug
    title_slug = full_slug[len(city) + 1:] if full_slug.startswith(city + '-') else full_slug
    return f"https://www.eventurer.online/events/{city}/{title_slug}"

def create_artist_slug(artist_name):
    """Create URL slug for an artist page, matching Next.js CityArtistsClient logic."""
    slug = artist_name.lower().replace(" ", "-")
    return urllib.parse.quote(slug)

def parse_artist_names(raw_artists):
    """
    Parse the artists field from a music_event row.
    Handles array-of-strings or single string, splitting on separators.
    Returns a list of clean artist names.
    """
    names = set()
    if not raw_artists:
        return []
    if isinstance(raw_artists, list):
        for entry in raw_artists:
            if not entry:
                continue
            for part in re.split(r'[,;&]|\s+vs\.?\s+|\s+and\s+', str(entry)):
                clean = re.sub(r'[{}""\'\[\]]', '', part).strip()
                if clean and clean.lower() != "tba":
                    names.add(clean)
    elif isinstance(raw_artists, str):
        for part in re.split(r'[,;&]|\s+vs\.?\s+|\s+and\s+', raw_artists):
            clean = re.sub(r'[{}""\'\[\]]', '', part).strip()
            if clean and clean.lower() != "tba":
                names.add(clean)
    return sorted(names)

def load_indexed_urls():
    """Loads already indexed URLs from the local log file into a set"""
    if not os.path.exists(INDEXED_LOG_FILE):
        return set()
    try:
        with open(INDEXED_LOG_FILE, "r", encoding="utf-8") as f:
            return set(line.strip() for line in f if line.strip())
    except Exception as e:
        print(f"Warning: Could not read indexed log file: {e}")
        return set()

def log_indexed_url(url: str):
    """Appends a successfully indexed URL to the local log file"""
    try:
        with open(INDEXED_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"{url}\n")
    except Exception as e:
        print(f"Warning: Could not write to indexed log file: {e}")

def get_all_google_auth_sessions():
    """Generates a list of authorized HTTP sessions from all service-account*.json files"""
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import AuthorizedSession
    except ImportError:
        print("Error: 'google-auth' library is not installed. Please run:")
        print("pip install google-auth")
        return []

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    key_files = [
        os.path.join(root_dir, f) 
        for f in os.listdir(root_dir) 
        if f.startswith("service-account") and f.endswith(".json")
    ]
    
    if not key_files:
        print(f"Error: No credentials files matching 'service-account*.json' found in {root_dir}")
        return []

    sessions = []
    scopes = ["https://www.googleapis.com/auth/indexing"]
    for kf in sorted(key_files):
        try:
            credentials = service_account.Credentials.from_service_account_file(kf, scopes=scopes)
            session = AuthorizedSession(credentials)
            sessions.append((os.path.basename(kf), session))
        except Exception as e:
            print(f"Error initializing Google Auth for {kf}: {e}")
            
    return sessions

def notify_google_url_detailed(session, url: str, action: str = "URL_UPDATED"):
    """
    Sends a notification to Google Indexing API.
    Returns:
      - "SUCCESS": Indexed successfully
      - "QUOTA_EXCEEDED": Rate/quota limit hit (429)
      - "FAILED": Any other error (403, 500, etc.)
    """
    endpoint = "https://indexing.googleapis.com/v3/urlNotifications:publish"
    payload = {
        "url": url,
        "type": action
    }
    
    try:
        res = session.post(endpoint, json=payload, timeout=10)
        if res.status_code == 200:
            print(f"✅ Google notified ({action}): {url}")
            return "SUCCESS"
        elif res.status_code == 429:
            # 429 is quota exhaustion
            print(f"⚠️ Quota exceeded (429) for {url}")
            return "QUOTA_EXCEEDED"
        else:
            print(f"❌ API Error ({res.status_code}) for {url}: {res.text}")
            return "FAILED"
    except Exception as e:
        print(f"❌ Network error notifying Google for {url}: {e}")
        return "FAILED"

def send_whatsapp(message: str):
    """Sends a WhatsApp message via CallMeBot API."""
    url = f"https://api.callmebot.com/whatsapp.php?phone={WHATSAPP_PHONE}&text={urllib.parse.quote(message)}&apikey={WHATSAPP_API_KEY}"
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            print(f"WhatsApp notification sent.")
        else:
            print(f"WhatsApp API error: {res.status_code}")
    except Exception as e:
        print(f"WhatsApp send failed: {e}")

def index_latest_events():
    """
    Fetches upcoming events from Supabase and registers them in Google Search.
    Only indexes URLs that haven't been submitted previously (tracked locally).
    Rotates service accounts automatically if multiple JSON files are present (200 requests/day per file).
    Self-heals and rotates to the next account immediately if a 429 error is hit.
    """
    sessions_info = get_all_google_auth_sessions()
    if not sessions_info:
        return

    total_quota = len(sessions_info) * 200
    print(f"Loaded {len(sessions_info)} service account(s). Max quota for this run: {total_quota} URLs.")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase config is missing.")
        return

    # Load already indexed URLs
    indexed_urls = load_indexed_urls()
    print(f"Loaded {len(indexed_urls)} previously indexed URLs from cache.")

    print("\n[Indexing] Fetching upcoming events from Supabase...")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    
    # Use timezone-aware UTC datetime format
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    
    # Query future approved events order by start date
    # We query up to 1000 items to search for unindexed events
    url = f"{SUPABASE_URL}/rest/v1/music_events?ends_at=gte.{now_iso}&order=starts_at.asc&limit=1000"
    
    RETRY_DELAYS_MIN = [30, 60, 120]  # retry delays in minutes

    try:
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            print(f"Failed to fetch events from Supabase: {res.status_code} - {res.text}")
            return
        
        events = res.json()
        print(f"Found {len(events)} active events in database.")
        
        # Define structural URLs (SEO-critical landing pages)
        cities = [
            "tokyo", "osaka", "london", "manchester", "liverpool", "birmingham", "bristol", "brighton", 
            "glasgow", "edinburgh", "newcastle", "leeds", "sheffield", "vilnius", "belgrade", "tbilisi", 
            "berlin", "new-york", "los-angeles", "chicago", "miami", "amsterdam", "paris", "barcelona", 
            "sydney", "melbourne", "perth"
        ]
        genres = ["techno", "house", "tech-house", "trance", "drum-and-bass", "dubstep", "disco", "funk", "hiphop"]

        structural_urls = [
            "https://www.eventurer.online",
            "https://www.eventurer.online/cities",
            "https://www.eventurer.online/artists"
        ]
        for city in cities:
            structural_urls.append(f"https://www.eventurer.online/{city}")
            structural_urls.append(f"https://www.eventurer.online/artists/{city}")
            for genre in genres:
                structural_urls.append(f"https://www.eventurer.online/{city}/{genre}")

        # Filter down to URLs that haven't been indexed yet
        initial_unindexed = []
        
        # Load structural URLs first with priority
        structural_added = 0
        for s_url in structural_urls:
            if s_url not in indexed_urls:
                mock_event = {"title": s_url.replace("https://www.eventurer.online", ""), "city": "SEO_SYSTEM"}
                initial_unindexed.append((s_url, mock_event))
                structural_added += 1
                
        if structural_added > 0:
            print(f"Added {structural_added} unindexed structural (City/Genre) URLs to queue.")

        for event in events:
            event_url = create_event_url(event.get("title"), event.get("city"))
            if event_url not in indexed_urls:
                initial_unindexed.append((event_url, event))

        print(f"Found {len(initial_unindexed)} total URLs (structural + events) that need indexing.")
        
        if not initial_unindexed:
            print("🎉 All upcoming events are already indexed! Nothing to do.")
            return

        success_count = 0
        indexed_set = set()

        def run_indexing_pass(pending, session_infos):
            nonlocal success_count, indexed_set
            if not pending:
                return []
            current_session_idx = 0
            current_session_requests = 0
            remaining = []

            for idx, (event_url, event) in enumerate(pending):
                if event_url in indexed_set:
                    continue
                event_submitted = False
                
                while current_session_idx < len(session_infos):
                    filename, session = session_infos[current_session_idx]
                    
                    if current_session_requests >= 200:
                        print(f"Reached 200 request limit for {filename}. Switching to next account...")
                        current_session_idx += 1
                        current_session_requests = 0
                        continue
                    
                    print(f"[{idx+1}/{len(pending)}] (Using {filename}) Indexing: {event.get('title')} ({event.get('city')})")
                    current_session_requests += 1
                    
                    res_status = notify_google_url_detailed(session, event_url, "URL_UPDATED")
                    
                    if res_status == "SUCCESS":
                        log_indexed_url(event_url)
                        indexed_set.add(event_url)
                        success_count += 1
                        event_submitted = True
                        break
                    elif res_status == "QUOTA_EXCEEDED":
                        print(f"⚠️ Account {filename} returned Quota Exceeded (429). Switching to next account...")
                        current_session_idx += 1
                        current_session_requests = 0
                        continue
                    else:
                        event_submitted = True
                        break
                
                if not event_submitted:
                    remaining.append((event_url, event))
            
            return remaining

        remaining = run_indexing_pass(initial_unindexed, sessions_info)

        # Retry loop for any URLs that were not indexed (e.g., quota exhausted mid-run)
        for retry_num, delay_min in enumerate(RETRY_DELAYS_MIN):
            if not remaining:
                break
            print(f"\n⏳ Retry {retry_num + 1}/{len(RETRY_DELAYS_MIN)}: {len(remaining)} URLs left. Waiting {delay_min} min...")
            time.sleep(delay_min * 60)
            # Re-initialize sessions to get fresh quota tracking
            fresh_sessions = get_all_google_auth_sessions()
            if not fresh_sessions:
                print("No service accounts available for retry.")
                break
            print(f"Retrying with {len(fresh_sessions)} account(s)...")
            remaining = run_indexing_pass(remaining, fresh_sessions)

        print(f"\n🎉 Successfully indexed {success_count} new events in this run!")
        if remaining:
            print(f"⚠️ {len(remaining)} events could not be indexed after all retries (quota may be fully exhausted).")

        artist_sessions = get_all_google_auth_sessions()
        artist_result = index_artist_pages(artist_sessions if artist_sessions else sessions_info, 0, 0, indexed_urls)

        total_new = success_count + (artist_result or 0)
        remaining_count = len(remaining) if remaining else 0
        
        # Load up-to-date all-time indexed count
        all_time_total = len(load_indexed_urls())
        
        summary = (
            f"📊 *Indexing Report*\n\n"
            f"Events indexed: {success_count}\n"
            f"Artists indexed: {artist_result or 0}\n"
            f"Total new URLs: {total_new}\n"
            f"Remaining (quota): {remaining_count}\n"
            f"All-time Total Indexed: {all_time_total}"
        )
        send_whatsapp(summary)

    except Exception as e:
        error_msg = f"❌ *Indexing Error*\n\n{str(e)}"
        send_whatsapp(error_msg)
        print(f"Error during bulk indexing: {e}")

def index_artist_pages(sessions_info, start_session_idx=0, session_requests=0, already_indexed=None):
    """
    Fetches unique artist–city pairs from upcoming events and submits
    individual artist page URLs to the Google Indexing API.
    Shares quota rotation with the event indexer.
    """
    if not sessions_info:
        sessions_info = get_all_google_auth_sessions()
        if not sessions_info:
            return 0

    if already_indexed is None:
        already_indexed = load_indexed_urls()

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }

    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    url = f"{SUPABASE_URL}/rest/v1/music_events?ends_at=gte.{now_iso}&order=starts_at.asc&limit=2000"

    try:
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            print(f"Failed to fetch events for artist extraction: {res.status_code}")
            return 0

        events = res.json()
        
        # Extract unique (city, artist_name) pairs
        artist_pairs = set()
        for event in events:
            city = (event.get("city") or "").lower().strip()
            if not city:
                continue
            raw = event.get("artists")
            for name in parse_artist_names(raw):
                artist_pairs.add((city, name))

        # Build page URLs and filter already-indexed
        to_index = []
        for city, name in sorted(artist_pairs):
            slug = create_artist_slug(name)
            page_url = f"https://www.eventurer.online/artists/{city}/{slug}"
            if page_url not in already_indexed:
                to_index.append((page_url, city, name))

        print(f"Found {len(artist_pairs)} unique artist–city pairs ({len(to_index)} need indexing).")

        if not to_index:
            print("🎉 All artist pages are already indexed! Nothing to do.")
            return

        success_count = 0
        current_session_idx = start_session_idx
        current_session_requests = session_requests

        for idx, (page_url, city, name) in enumerate(to_index):
            submitted = False
            while current_session_idx < len(sessions_info):
                filename, session = sessions_info[current_session_idx]
                if current_session_requests >= 200:
                    print(f"Reached 200 request limit for {filename}. Switching to next account...")
                    current_session_idx += 1
                    current_session_requests = 0
                    continue

                print(f"[Artist {idx+1}/{len(to_index)}] (Using {filename}) Indexing: {name} ({city})")
                current_session_requests += 1
                res_status = notify_google_url_detailed(session, page_url, "URL_UPDATED")

                if res_status == "SUCCESS":
                    log_indexed_url(page_url)
                    success_count += 1
                    submitted = True
                    break
                elif res_status == "QUOTA_EXCEEDED":
                    print(f"⚠️ Account {filename} quota exceeded. Switching to next account...")
                    current_session_idx += 1
                    current_session_requests = 0
                    continue
                else:
                    submitted = True
                    break

            if not submitted:
                print("\nAll available service accounts exhausted for artist pages.")
                break

        print(f"\n🎉 Successfully indexed {success_count} new artist pages in this run!")
        return success_count

    except Exception as e:
        print(f"Error during artist page indexing: {e}")
        return 0

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Allow checking a specific URL manually
        test_url = sys.argv[1]
        sessions_info = get_all_google_auth_sessions()
        if sessions_info:
            filename, session = sessions_info[0]
            print(f"Running manual indexing test for: {test_url} using {filename}")
            notify_google_url_detailed(session, test_url, "URL_UPDATED")
    else:
        # Run indexing with all loaded sessions
        index_latest_events()
