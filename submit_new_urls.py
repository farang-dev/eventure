import os, sys, re, json, time, urllib.parse
from datetime import datetime
from dotenv import load_dotenv

ROOT = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(ROOT, "scraper", ".env"))

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def create_slug(title, city):
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

def get_sessions():
    from google.oauth2 import service_account
    from google.auth.transport.requests import AuthorizedSession

    key_files = sorted([
        os.path.join(ROOT, f) for f in os.listdir(ROOT)
        if f.startswith("service-account") and f.endswith(".json")
    ])
    if not key_files:
        print("No service-account files found.")
        return []
    sessions = []
    scopes = ["https://www.googleapis.com/auth/indexing"]
    for kf in key_files:
        try:
            creds = service_account.Credentials.from_service_account_file(kf, scopes=scopes)
            sessions.append((os.path.basename(kf), AuthorizedSession(creds)))
        except Exception as e:
            print(f"Error: {e}")
    return sessions

def notify_url(session, url):
    endpoint = "https://indexing.googleapis.com/v3/urlNotifications:publish"
    try:
        res = session.post(endpoint, json={"url": url, "type": "URL_UPDATED"}, timeout=10)
        if res.status_code == 200:
            return "SUCCESS"
        elif res.status_code == 429:
            return "QUOTA_EXCEEDED"
        else:
            print(f"    API error {res.status_code}: {res.text[:150]}")
            return "FAILED"
    except Exception as e:
        print(f"    Network error: {e}")
        return "FAILED"

def main():
    sessions = get_sessions()
    if not sessions:
        sys.exit(1)

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Supabase credentials missing.")
        sys.exit(1)

    print(f"Loaded {len(sessions)} service accounts.\n")

    # Fetch upcoming events
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/music_events?ends_at=gte.{now}&order=starts_at.asc&limit=1000",
        headers=headers,
    )
    if res.status_code != 200:
        print(f"Supabase error: {res.status_code} - {res.text[:200]}")
        return
    events = res.json()
    print(f"Found {len(events)} upcoming events.\n")

    # Generate new-format URLs
    urls_to_submit = []
    for ev in events:
        url = create_event_url(ev.get("title"), ev.get("city"))
        urls_to_submit.append(url)

    # Also submit structural URLs (city/genre pages)
    cities = [
        "tokyo", "osaka", "london", "manchester", "liverpool", "birmingham", "bristol", "brighton",
        "glasgow", "edinburgh", "newcastle", "leeds", "sheffield", "vilnius", "belgrade", "tbilisi",
        "berlin", "new-york", "los-angeles", "chicago", "miami", "amsterdam", "paris", "barcelona",
        "sydney", "melbourne", "perth"
    ]
    structural = [
        "https://www.eventurer.online",
        "https://www.eventurer.online/events/cities",
        "https://www.eventurer.online/artists",
    ]
    for city in cities:
        structural.append(f"https://www.eventurer.online/events/{city}")
    urls_to_submit = structural + urls_to_submit

    print(f"Total URLs to submit: {len(urls_to_submit)}")
    print()

    # Submit using round-robin across service accounts (200 req/day each)
    success = 0
    quota_exhausted = False
    si = 0
    req_this_session = 0

    for i, url in enumerate(urls_to_submit):
        if quota_exhausted:
            print(f"  [{i+1}/{len(urls_to_submit)}] SKIP (quota): {url}")
            continue

        submitted = False
        while si < len(sessions):
            name, session = sessions[si]
            if req_this_session >= 200:
                print(f"  Switching to next account ({name} used 200/200)")
                si += 1
                req_this_session = 0
                continue

            print(f"  [{i+1}/{len(urls_to_submit)}] ({name}) {url}")
            req_this_session += 1
            status = notify_url(session, url)

            if status == "SUCCESS":
                success += 1
                submitted = True
                break
            elif status == "QUOTA_EXCEEDED":
                print(f"  QUOTA on {name}, switching...")
                si += 1
                req_this_session = 0
                continue
            else:
                submitted = True
                break

        if not submitted:
            print(f"  ❌ All accounts exhausted.")
            quota_exhausted = True

    print(f"\n🎉 Done! {success}/{len(urls_to_submit)} URLs submitted successfully.")
    print("⏳ Google takes a few hours to days to crawl and index them.")

if __name__ == "__main__":
    import requests
    main()
