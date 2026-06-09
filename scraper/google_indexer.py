import os
import sys
import json
import re
import time
import urllib.parse
import traceback
import requests
from datetime import datetime
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

INDEXED_LOG_FILE = os.path.join(os.path.dirname(__file__), "indexed_urls.txt")

WHATSAPP_PHONE = os.environ.get("WHATSAPP_PHONE") or "818041185473"
WHATSAPP_API_KEY = os.environ.get("WHATSAPP_API_KEY") or "2645005"

ALL_CITIES = [
    "tokyo", "osaka", "london", "manchester", "liverpool", "birmingham", "bristol", "brighton",
    "glasgow", "edinburgh", "newcastle", "leeds", "sheffield", "vilnius", "belgrade", "tbilisi",
    "berlin", "new-york", "los-angeles", "chicago", "miami", "amsterdam", "paris", "barcelona",
    "sydney", "melbourne", "perth", "adelaide", "hobart", "brisbane", "san-francisco", "detroit",
    "munich", "hamburg", "cologne", "stuttgart", "frankfurt",
]
ALL_GENRES = ["techno", "house", "tech-house", "trance", "drum-and-bass", "dubstep", "disco", "funk", "hiphop"]


def create_slug(title, city):
    if not title:
        return ""
    city = city or "various"
    clean = f"{city}-{title}".lower()
    clean = re.sub(r'[^\w\s-]', '', clean)
    clean = re.sub(r'[\s_]+', '-', clean)
    return clean.strip('-')


def create_event_url(title, city):
    city = (city or "various").lower().replace(' ', '-')
    full_slug = create_slug(title, city)
    title_slug = full_slug[len(city) + 1:] if full_slug.startswith(city + '-') else full_slug
    return f"https://www.eventurer.online/events/{city}/{title_slug}"


def create_artist_slug(artist_name):
    slug = artist_name.lower().replace(" ", "-")
    return urllib.parse.quote(slug)


def parse_artist_names(raw_artists):
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
    if not os.path.exists(INDEXED_LOG_FILE):
        return set()
    try:
        with open(INDEXED_LOG_FILE, "r", encoding="utf-8") as f:
            return set(line.strip() for line in f if line.strip())
    except Exception as e:
        print(f"Warning: Could not read indexed log file: {e}")
        return set()


def log_indexed_url(url: str):
    try:
        with open(INDEXED_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"{url}\n")
    except Exception as e:
        print(f"Warning: Could not write to indexed log file: {e}")


def get_all_google_auth_sessions():
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import AuthorizedSession
    except ImportError:
        print("Error: 'google-auth' library is not installed.")
        return []

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        key_files = [
            os.path.join(root_dir, f)
            for f in os.listdir(root_dir)
            if f.startswith("service-account") and f.endswith(".json")
        ]
    except Exception as e:
        print(f"Error listing service account files: {e}")
        return []

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
    endpoint = "https://indexing.googleapis.com/v3/urlNotifications:publish"
    payload = {"url": url, "type": action}
    try:
        res = session.post(endpoint, json=payload, timeout=10)
        if res.status_code == 200:
            print(f"  ✅ Google notified: {url}")
            return "SUCCESS"
        elif res.status_code == 429:
            print(f"  ⚠️ Quota exceeded (429): {url}")
            return "QUOTA_EXCEEDED"
        else:
            print(f"  ❌ API Error ({res.status_code}): {url} — {res.text[:200]}")
            return "FAILED"
    except Exception as e:
        print(f"  ❌ Network error: {url} — {e}")
        return "FAILED"


def send_whatsapp(message: str):
    url = f"https://api.callmebot.com/whatsapp.php?phone={WHATSAPP_PHONE}&text={urllib.parse.quote(message)}&apikey={WHATSAPP_API_KEY}"
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            print(f"WhatsApp notification sent.")
        else:
            print(f"WhatsApp API error: {res.status_code}")
    except Exception as e:
        print(f"WhatsApp send failed: {e}")


def fetch_supabase_events(url_suffix: str):
    """Fetch events from Supabase REST API. Returns list of events or None on failure."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase config is missing.")
        return None
    base = SUPABASE_URL.rstrip("/")
    url = f"{base}/rest/v1/music_events{url_suffix}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    res = requests.get(url, headers=headers, timeout=30)
    if res.status_code != 200:
        print(f"Supabase API error ({res.status_code}): {res.text[:300]}")
        return None
    return res.json()


def build_structural_urls():
    """Build the list of SEO-critical landing page URLs (correct canonical paths)."""
    urls = [
        "https://www.eventurer.online",
        "https://www.eventurer.online/events/cities",
        "https://www.eventurer.online/artists",
        "https://www.eventurer.online/venues",
    ]
    for city in ALL_CITIES:
        urls.append(f"https://www.eventurer.online/events/{city}")
        urls.append(f"https://www.eventurer.online/venues/{city}")
        urls.append(f"https://www.eventurer.online/artists/{city}")
        for genre in ALL_GENRES:
            urls.append(f"https://www.eventurer.online/{city}/{genre}")
    return urls


def run_indexing_pass(pending, session_infos):
    """Submit a batch of URLs using the provided sessions. Returns list of not-submitted URLs."""
    if not pending or not session_infos:
        return pending or []
    success_count = 0
    indexed_set = set()
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
                print(f"  Account {filename} hit 200 limit. Switching...")
                current_session_idx += 1
                current_session_requests = 0
                continue

            print(f"[{idx+1}/{len(pending)}] ({filename}) {event.get('title','?')} ({event.get('city','?')})")
            current_session_requests += 1

            res_status = notify_google_url_detailed(session, event_url, "URL_UPDATED")

            if res_status == "SUCCESS":
                log_indexed_url(event_url)
                indexed_set.add(event_url)
                success_count += 1
                event_submitted = True
                break
            elif res_status == "QUOTA_EXCEEDED":
                current_session_idx += 1
                current_session_requests = 0
                continue
            else:
                event_submitted = True
                break

        if not event_submitted:
            remaining.append((event_url, event))

    return remaining, success_count


def index_latest_events():
    error_info = None
    summary_parts = []

    try:
        sessions_info = get_all_google_auth_sessions()
        if not sessions_info:
            error_info = "No service accounts available"
            send_whatsapp(f"❌ *Indexing Error*\n\nNo service accounts could be loaded.")
            return

        print(f"Loaded {len(sessions_info)} service account(s). Max quota: {len(sessions_info) * 200} URLs.")

        indexed_urls = load_indexed_urls()
        print(f"Loaded {len(indexed_urls)} previously indexed URLs.")

        now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
        or_filter = urllib.parse.quote("(is_approved.eq.true,is_approved.is.null)")

        # ── Fetch events from Supabase ──
        events = fetch_supabase_events(f"?ends_at=gte.{now_iso}&order=starts_at.asc&limit=1000&or={or_filter}")
        if events is None:
            send_whatsapp(f"❌ *Indexing Error*\n\nCannot connect to Supabase. Check env vars.")
            return

        print(f"Found {len(events)} active events in database.")

        # ── Build structural + event URLs to index ──
        structural_urls = build_structural_urls()

        pending = []
        structural_added = 0
        for s_url in structural_urls:
            if s_url not in indexed_urls:
                pending.append((s_url, {"title": s_url.replace("https://www.eventurer.online", ""), "city": "SEO"}))
                structural_added += 1
        if structural_added > 0:
            print(f"Added {structural_added} unindexed structural URLs.")

        for event in events:
            event_url = create_event_url(event.get("title"), event.get("city"))
            if event_url not in indexed_urls:
                pending.append((event_url, event))

        print(f"Total URLs to index: {len(pending)}")
        summary_parts.append(f"URLs to index: {len(pending)}")

        if not pending:
            msg = "✅ *Indexing Report*\n\nAll URLs already indexed. Nothing to do."
            print(msg)
            send_whatsapp(msg)
            return

        # ── Run indexing ──
        remaining, success_count = run_indexing_pass(pending, sessions_info)

        # ── Retry with fresh sessions if needed ──
        RETRY_DELAYS_MIN = [30, 60, 120]
        for retry_num, delay_min in enumerate(RETRY_DELAYS_MIN):
            if not remaining:
                break
            print(f"\n⏳ Retry {retry_num+1}: {len(remaining)} left. Waiting {delay_min}min...")
            time.sleep(delay_min * 60)
            fresh = get_all_google_auth_sessions()
            if not fresh:
                break
            remaining, retry_success = run_indexing_pass(remaining, fresh)
            success_count += retry_success

        print(f"\n🎉 Indexed {success_count} new URLs.")
        if remaining:
            print(f"⚠️ {len(remaining)} URLs could not be indexed (quota exhausted).")

        summary_parts = [
            f"Indexed: {success_count}",
            f"Remaining: {len(remaining) if remaining else 0}",
            f"Total Indexed: {len(load_indexed_urls())}",
        ]

        send_whatsapp(
            f"📊 *Indexing Report*\n\n"
            + "\n".join(summary_parts)
        )

    except Exception as e:
        tb = traceback.format_exc()
        print(f"Fatal error: {tb}")
        send_whatsapp(f"❌ *Indexing Crash*\n\n{tb[:500]}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_url = sys.argv[1]
        sessions_info = get_all_google_auth_sessions()
        if sessions_info:
            filename, session = sessions_info[0]
            print(f"Manual indexing test: {test_url} using {filename}")
            notify_google_url_detailed(session, test_url, "URL_UPDATED")
    else:
        index_latest_events()
