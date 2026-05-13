import os
import requests
from dotenv import load_dotenv

# Load from .env.local in the root
load_dotenv(".env.local")
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

print(f"URL: {url}")

# 1. Count all events
res = requests.get(f"{url}/rest/v1/music_events?select=count", headers={"apikey": key, "Authorization": f"Bearer {key}", "Prefer": "count=exact"})
print(f"Total events in DB: {res.headers.get('Content-Range')}")

# 2. Check Vilnius events specifically
res = requests.get(f"{url}/rest/v1/music_events?city=eq.vilnius&select=id,title,venue_name,lat,lng,city", headers=headers)
data = res.json()
print(f"\nVilnius events ({len(data)}):")
for i, row in enumerate(data):
    print(f"{i+1}. [{row['id']}] {row['title']} @ {row['venue_name']} ({row['lat']}, {row['lng']}) city={row['city']}")

# 3. Check for any events with 'Elastica' in venue name
res = requests.get(f"{url}/rest/v1/music_events?venue_name=ilike.*Elastica*&select=id,title,venue_name,lat,lng,city", headers=headers)
data = res.json()
print(f"\nElastica venues found ({len(data)}):")
for i, row in enumerate(data):
    print(f"{i+1}. [{row['id']}] {row['title']} @ {row['venue_name']} ({row['lat']}, {row['lng']}) city={row['city']}")
