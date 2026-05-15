import json
import requests
from datetime import datetime, timedelta

RA_GRAPHQL_URL = 'https://ra.co/graphql'
RA_HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

with open("scraper/graphql_query_template.json", "r") as file:
    payload = json.load(file)

# Vilnius Area ID is 561
payload["variables"]["filters"]["areas"]["eq"] = 561
payload["variables"]["filters"]["listingDate"]["gte"] = datetime.now().strftime("%Y-%m-%dT00:00:00.000Z")
payload["variables"]["filters"]["listingDate"]["lte"] = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%dT23:59:59.999Z")
payload["variables"]["pageSize"] = 100

response = requests.post(RA_GRAPHQL_URL, headers=RA_HEADERS, json=payload)
data = response.json()
listings = data.get("data", {}).get("eventListings", {}).get("data", [])

for l in listings:
    ev = l.get("event", {})
    venue = ev.get("venue", {})
    if "Vasaros" in (venue.get("name") or ""):
        print(f"Venue: {venue.get('name')}")
        print(f"RA Native Location: {venue.get('location')}")
        print(f"RA Address: {venue.get('address')}")
        break
else:
    print("Vasaros terasa not found in the next 30 days.")

