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

KEY_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "service-account.json")

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

def get_google_auth_session():
    """Generates an authorized HTTP session using service-account.json"""
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import AuthorizedSession
    except ImportError:
        print("Error: 'google-auth' library is not installed. Please run:")
        print("pip install google-auth")
        return None

    if not os.path.exists(KEY_FILE):
        print(f"Error: Credentials file not found at {KEY_FILE}")
        return None

    try:
        scopes = ["https://www.googleapis.com/auth/indexing"]
        credentials = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=scopes)
        session = AuthorizedSession(credentials)
        return session
    except Exception as e:
        print(f"Error initializing Google Auth: {e}")
        return None

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

def index_latest_events(limit: int = 150):
    """
    Fetches the newest upcoming events from Supabase and registers them in Google Search.
    """
    session = get_google_auth_session()
    if not session:
        return

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase config is missing.")
        return

    print("\n[Indexing] Fetching upcoming events from Supabase...")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    
    now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    
    # Query future approved events order by start date
    url = f"{SUPABASE_URL}/rest/v1/music_events?ends_at=gte.{now_iso}&order=starts_at.asc&limit={limit}"
    
    try:
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            print(f"Failed to fetch events from Supabase: {res.status_code} - {res.text}")
            return
        
        events = res.json()
        print(f"Found {len(events)} active events in database.")
        
        success_count = 0
        for idx, event in enumerate(events):
            slug = create_slug(event.get("title"), event.get("city"))
            event_url = f"https://www.eventurer.online/event/{slug}"
            
            print(f"[{idx+1}/{len(events)}] Indexing: {event.get('title')} ({event.get('city')})")
            if notify_google_url(session, event_url, "URL_UPDATED"):
                success_count += 1
                
        print(f"\n🎉 Successfully indexed {success_count} / {len(events)} events!")
            
    except Exception as e:
        print(f"Error during bulk indexing: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Allow checking a specific URL manually
        test_url = sys.argv[1]
        session = get_google_auth_session()
        if session:
            print(f"Running manual indexing test for: {test_url}")
            notify_google_url(session, test_url, "URL_UPDATED")
    else:
        # Default: Index up to 150 upcoming events
        index_latest_events(limit=150)
