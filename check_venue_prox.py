import os
import requests
from dotenv import load_dotenv

load_dotenv('scraper/.env')

mapbox_token = os.environ.get("NEXT_PUBLIC_MAPBOX_TOKEN") or os.environ.get("MAPBOX_TOKEN")
queries = [
    "Vasaros terasa, vilnius",
    "Vasaros terasa, Vilniaus g. 39, Vilnius", 
    "Vilniaus g. 39, Vilnius",
    "Haze Pub, 12, Konstitucijos pr., 09309 Vilnius"
]

# Vilnius center
lng_base, lat_base = 25.2797, 54.6872

print("--- Mapbox Geocoding Tests WITH PROXIMITY ---")
for q in queries:
    res = requests.get(
        f"https://api.mapbox.com/geocoding/v5/mapbox.places/{requests.utils.quote(q)}.json",
        params={
            "access_token": mapbox_token, 
            "limit": 1,
            "proximity": f"{lng_base},{lat_base}"
        }
    ).json()
    
    if res.get("features"):
        center = res["features"][0]["center"]
        place_name = res["features"][0]["place_name"]
        print(f"Query: '{q}'\n -> Found: {center[1]}, {center[0]}\n -> Place: {place_name}\n")
    else:
        print(f"Query: '{q}'\n -> Found: Nothing\n")

