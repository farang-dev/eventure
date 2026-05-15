import os
import requests
from dotenv import load_dotenv

load_dotenv('scraper/.env')

# 1. Check Mapbox Geocoding for Vasaros terasa
mapbox_token = os.environ.get("NEXT_PUBLIC_MAPBOX_TOKEN") or os.environ.get("MAPBOX_TOKEN")
queries = [
    "Vasaros terasa, vilnius",
    "Vasaros terasa, Vilniaus g. 39, Vilnius", 
    "Vilniaus g. 39, Vilnius"
]

print("--- Mapbox Geocoding Tests ---")
for q in queries:
    res = requests.get(
        f"https://api.mapbox.com/geocoding/v5/mapbox.places/{requests.utils.quote(q)}.json",
        params={"access_token": mapbox_token, "limit": 1}
    ).json()
    
    if res.get("features"):
        center = res["features"][0]["center"]
        place_name = res["features"][0]["place_name"]
        print(f"Query: '{q}'\n -> Found: {center[1]}, {center[0]}\n -> Place: {place_name}\n")
    else:
        print(f"Query: '{q}'\n -> Found: Nothing\n")

