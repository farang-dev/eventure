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

# Try to fetch table info
res = requests.get(f"{url}/rest/v1/music_events?limit=1", headers=headers)
print("Fetch status:", res.status_code)
print("Data:", res.json())
