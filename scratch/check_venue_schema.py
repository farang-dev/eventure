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
        }
      }
    }
    """
}

res = requests.post(url, json=payload, headers=headers)
print(res.text)
