import os
import requests
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

res = requests.get(f"{url}/rest/v1/music_events?city=eq.vilnius&select=title,venue_name,lat,lng,starts_at", headers=headers)
data = res.json()
for row in data:
    print(f"Title: {row['title']}, Venue: {row['venue_name']}, Lat: {row['lat']}, Lng: {row['lng']}, Start: {row['starts_at']}")
