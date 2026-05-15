import json
import requests
from datetime import datetime

RA_GRAPHQL_URL = 'https://ra.co/graphql'
RA_HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

with open("scraper/graphql_query_template.json", "r") as file:
    payload = json.load(file)

payload["variables"]["filters"]["areas"]["eq"] = 561
payload["variables"]["filters"]["listingDate"]["gte"] = datetime.now().strftime("%Y-%m-%dT00:00:00.000Z")
payload["variables"]["filters"]["listingDate"]["lte"] = datetime.now().strftime("%Y-%m-%dT23:59:59.999Z")

response = requests.post(RA_GRAPHQL_URL, headers=RA_HEADERS, json=payload)
print(f"Status: {response.status_code}")
print(json.dumps(response.json(), indent=2))
