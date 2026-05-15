import json
import requests

# Mapbox test for WOMB
mapbox_token = "__MAPBOX_TOKEN__"
# In real script I will use the actual token from env
import os
from dotenv import load_dotenv
load_dotenv('scraper/.env')
mapbox_token = os.environ.get("NEXT_PUBLIC_MAPBOX_TOKEN") or os.environ.get("MAPBOX_TOKEN")

venue_name = "WOMB"
city_name = "tokyo"
lat_base, lng_base = 35.6580, 139.7016 # Shibuya

search_query = f"{venue_name}, tokyo"
res = requests.get(
    f"https://api.mapbox.com/geocoding/v5/mapbox.places/{requests.utils.quote(search_query)}.json",
    params={"access_token": mapbox_token, "limit": 1, "proximity": f"{lng_base},{lat_base}"}
).json()

if res.get("features"):
    center = res["features"][0]["center"]
    print(f"WOMB Mapbox: {center[1]}, {center[0]} ({res['features'][0]['place_name']})")

# RA WOMB (Need to fetch it)
# Typical RA WOMB coords are 35.6585, 139.695
# Let's see the distance
