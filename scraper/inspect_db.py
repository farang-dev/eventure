import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing Supabase credentials")
    exit(1)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

try:
    res = requests.get(f"{SUPABASE_URL}/rest/v1/music_events?limit=10", headers=headers)
    events = res.json()
    for e in events:
        print(f"City: {e['city']} | Venue: {e['venue_name']} | Lat: {e['lat']} | Lng: {e['lng']} | Address: {e.get('venue_address')}")
except Exception as e:
    print(f"Error: {e}")
