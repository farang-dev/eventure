#!/usr/bin/env python3
"""
Daily job: Submit new-format event URLs to Google Indexing API.
Runs through all 5 service accounts (200 req/day each = 1000/day).
Skips URLs already in indexed_urls.txt cache.
"""

import os, sys, re, json, time
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from dotenv import load_dotenv
load_dotenv(os.path.join(ROOT, "scraper", ".env"))

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
INDEXED_CACHE = os.path.join(ROOT, "scraper", "indexed_urls.txt")

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

def load_indexed():
    if not os.path.exists(INDEXED_CACHE):
        return set()
    with open(INDEXED_CACHE, "r") as f:
        return set(line.strip() for line in f if line.strip())

def save_indexed(url):
    with open(INDEXED_CACHE, "a") as f:
        f.write(f"{url}\n")

def get_sessions():
    from google.oauth2 import service_account
    from google.auth.transport.requests import AuthorizedSession
    key_files = sorted([
        os.path.join(ROOT, f) for f in os.listdir(ROOT)
        if f.startswith("service-account") and f.endswith(".json")
    ])
    sessions = []
    for kf in key_files:
        try:
            creds = service_account.Credentials.from_service_account_file(
                kf, scopes=["https://www.googleapis.com/auth/indexing"]
            )
            sessions.append((os.path.basename(kf), AuthorizedSession(creds)))
        except Exception as e:
            print(f"  Error loading {kf}: {e}")
    return sessions

def submit_url(session, url):
    try:
        res = session.post(
            "https://indexing.googleapis.com/v3/urlNotifications:publish",
            json={"url": url, "type": "URL_UPDATED"},
            timeout=10,
        )
        if res.status_code == 200:
            return "OK"
        elif res.status_code == 429:
            return "QUOTA"
        else:
            print(f"    HTTP {res.status_code}: {res.text[:120]}")
            return "FAIL"
    except Exception as e:
        print(f"    Error: {e}")
        return "FAIL"

def main():
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Starting daily URL submission...")

    sessions = get_sessions()
    if not sessions:
        print("No service accounts!")
        return

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("No Supabase credentials!")
        return

    # Load cache
    indexed = load_indexed()
    print(f"Cache: {len(indexed)} URLs already submitted.")

    # Fetch upcoming events
    import requests as http
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z")
    res = http.get(
        f"{SUPABASE_URL}/rest/v1/music_events?ends_at=gte.{now}&order=starts_at.asc&limit=1000",
        headers=headers,
    )
    if res.status_code != 200:
        print(f"Supabase error: {res.status_code}")
        return
    events = res.json()
    print(f"Events: {len(events)} upcoming.")

    # Build structural URLs
    cities = ["tokyo","osaka","london","manchester","liverpool","birmingham","bristol","brighton",
              "glasgow","edinburgh","newcastle","leeds","sheffield","vilnius","belgrade","tbilisi",
              "berlin","new-york","los-angeles","chicago","miami","amsterdam","paris","barcelona",
              "sydney","melbourne","perth"]
    urls = ["https://www.eventurer.online", "https://www.eventurer.online/events/cities",
            "https://www.eventurer.online/artists"]
    for c in cities:
        urls.append(f"https://www.eventurer.online/events/{c}")
    for ev in events:
        urls.append(create_event_url(ev.get("title"), ev.get("city")))

    # Filter unsubmitted
    pending = [u for u in urls if u not in indexed]
    print(f"Pending: {len(pending)} new URLs to submit.")

    if not pending:
        print("Nothing to do.")
        return

    # Submit round-robin
    success = 0
    session_idx = 0
    req_count = 0

    for url in pending:
        submitted = False
        while session_idx < len(sessions):
            name, session = sessions[session_idx]
            if req_count >= 200:
                print(f"  Switched: {name} used 200/200.")
                session_idx += 1
                req_count = 0
                continue

            req_count += 1
            status = submit_url(session, url)

            if status == "OK":
                save_indexed(url)
                success += 1
                submitted = True
                break
            elif status == "QUOTA":
                print(f"  Quota: {name}, switching...")
                session_idx += 1
                req_count = 0
                continue
            else:
                submitted = True
                break

        if not submitted:
            print(f"  ⚠️ All accounts exhausted after {success} submissions.")
            break

    print(f"Done: {success}/{len(pending)} new URLs submitted.")

if __name__ == "__main__":
    main()
