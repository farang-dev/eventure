import requests
import json

url = "https://ra.co/graphql"
headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0'
}

payload = {
    "query": """
    {
      __type(name: "Venue") {
        fields {
          name
          type {
            name
            fields {
              name
            }
          }
        }
      }
    }
    """
}

res = requests.post(url, json=payload, headers=headers)
data = res.json()
for field in data['data']['__type']['fields']:
    if field['name'] == 'location':
        print(json.dumps(field, indent=2))
