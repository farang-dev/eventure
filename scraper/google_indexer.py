import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

# Add parent directory or local scraper folder to path if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load env variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

INDEXED_LOG_FILE = os.path.join(os.path.dirname(__file__), "indexed_urls.txt")

def create_slug(title, city):
    """Helper to match Next.js event slug generation logic"""
    import re
    if not title:
        return ""
    # Lowercase, replace non-alphanumeric with hyphen
    clean = f"{city}-{title}".lower()
    clean = re.sub(r'[^a-z0-9\s-]', '', clean)
    clean = re.sub(r'[\s-]+', '-', clean)
    return clean.strip('-')

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

def notify_google_url(session, url: str, action: str = "URL_UPDATED"):
    """
    Sends a notification to Google Indexing API.
    action can be:
      - "URL_UPDATED" : To index or update URL
      - "URL_DELETED" : To notify Google the page is gone
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
            return True
        else:
            print(f"❌ API Error ({res.status_code}) for {url}: {res.text}")
            return False
    except Exception as e:
        print(f"❌ Network error notifying Google for {url}: {e}")
        return False

def index_latest_events():
    """
    Fetches upcoming events from Supabase and registers them in Google Search.
    Only indexes URLs that haven't been submitted previously (tracked locally).
    Rotates service accounts automatically if multiple JSON files are present (200 requests/day per file).
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
    
    try:
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            print(f"Failed to fetch events from Supabase: {res.status_code} - {res.text}")
            return
        
        events = res.json()
        print(f"Found {len(events)} active events in database.")
        
        # Filter down to events that haven't been indexed yet
        unindexed_events = []
        for event in events:
            slug = create_slug(event.get("title"), event.get("city"))
            event_url = f"https://www.eventurer.online/event/{slug}"
            if event_url not in indexed_urls:
                unindexed_events.append((event_url, event))

        print(f"Found {len(unindexed_events)} events that need indexing.")
        
        if not unindexed_events:
            print("🎉 All upcoming events are already indexed! Nothing to do.")
            return

        success_count = 0
        for idx, (event_url, event) in enumerate(unindexed_events):
            # Calculate which service account session to use (each handles up to 200 requests)
            session_idx = success_count // 200
            if session_idx >= len(sessions_info):
                print(f"Reached overall quota limit of {total_quota} events for this run.")
                break
                
            filename, session = sessions_info[session_idx]
            
            print(f"[{idx+1}/{len(unindexed_events)}] (Using {filename}) Indexing: {event.get('title')} ({event.get('city')})")
            if notify_google_url(session, event_url, "URL_UPDATED"):
                log_indexed_url(event_url)
                success_count += 1
                
        print(f"\n🎉 Successfully indexed {success_count} new events in this run!")
            
    except Exception as e:
        print(f"Error during bulk indexing: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Allow checking a specific URL manually
        test_url = sys.argv[1]
        sessions_info = get_all_google_auth_sessions()
        if sessions_info:
            filename, session = sessions_info[0]
            print(f"Running manual indexing test for: {test_url} using {filename}")
            notify_google_url(session, test_url, "URL_UPDATED")
    else:
        # Run indexing with all loaded sessions
        index_latest_events()
