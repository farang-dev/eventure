import os
import sys
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.abspath(__file__))
VENV = os.path.join(ROOT, "scraper", "venv", "bin", "python3")
if not os.path.exists(VENV):
    VENV = sys.executable

from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]

key_files = sorted([
    os.path.join(ROOT, f) for f in os.listdir(ROOT)
    if f.startswith("service-account") and f.endswith(".json")
])
if not key_files:
    print("No service account files found.")
    sys.exit(1)

creds = service_account.Credentials.from_service_account_file(key_files[0], scopes=SCOPES)
print(f"Service Account: {creds.service_account_email}")

service = build("searchconsole", "v1", credentials=creds)

# List sites
print("\n=== Sites in Search Console ===")
sites = service.sites().list().execute()
site_entries = sites.get("siteEntry", [])
for s in site_entries:
    print(f"  {s['siteUrl']:45s}  {s.get('permissionLevel','N/A')}")

target = "sc-domain:eventurer.online"
site_url = None
for s in site_entries:
    if s["siteUrl"] == target:
        site_url = target
        break
if not site_url:
    print(f"\n❌ '{target}' not found in Search Console sites.")
    sys.exit(1)
print(f"\n✓ Using: {site_url}")
print()

today = datetime.now(timezone.utc)
week_ago = today - timedelta(days=7)
two_weeks_ago = today - timedelta(days=14)

def fmt_date(d):
    return d.strftime("%Y-%m-%d")

# 1. Performance last 7d
print("=== Total Performance (last 7d) ===")
r = service.searchanalytics().query(
    siteUrl=site_url,
    body={"startDate": fmt_date(week_ago), "endDate": fmt_date(today), "dimensions": ["query"], "rowLimit": 25}
).execute()
rows = r.get("rows", [])
if rows:
    total_clicks = sum(row.get("clicks", 0) for row in rows)
    total_imps = sum(row.get("impressions", 0) for row in rows)
    total_ctr = sum(row.get("ctr", 0) for row in rows) / len(rows)
    total_pos = sum(row.get("position", 0) for row in rows) / len(rows)
    print(f"  Clicks:      {total_clicks}")
    print(f"  Impressions: {total_imps}")
    print(f"  Avg CTR:     {total_ctr:.2%}")
    print(f"  Avg Pos:     {total_pos:.1f}")
    print(f"  Top queries:")
    for row in rows[:10]:
        print(f"    {row['keys'][0]:30s}  {row['impressions']:>5} imps  {row['clicks']} clicks  pos {row['position']:.1f}")
else:
    print("  No data for last 7 days.")

# 2. Week-over-week comparison
print("\n=== Week-over-Week ===")
r_prev = service.searchanalytics().query(
    siteUrl=site_url,
    body={"startDate": fmt_date(two_weeks_ago), "endDate": fmt_date(week_ago), "dimensions": ["query"], "rowLimit": 25}
).execute()
prev_imps = sum(row.get("impressions", 0) for row in r_prev.get("rows", []))
curr_imps = sum(row.get("impressions", 0) for row in r.get("rows", []))
print(f"  Previous 7d ({fmt_date(two_weeks_ago)}–{fmt_date(week_ago)}): {prev_imps} imps")
print(f"  Last    7d ({fmt_date(week_ago)}–{fmt_date(today)}):       {curr_imps} imps")
if prev_imps > 0:
    pct = ((curr_imps - prev_imps) / prev_imps) * 100
    print(f"  Change: {pct:+.1f}%")

# 3. Daily breakdown
print("\n=== Daily Impressions (last 14d) ===")
r_daily = service.searchanalytics().query(
    siteUrl=site_url,
    body={"startDate": fmt_date(two_weeks_ago), "endDate": fmt_date(today), "dimensions": ["date"], "rowLimit": 14}
).execute()
for row in r_daily.get("rows", []):
    d = row["keys"][0]
    print(f"  {d}:  {row['impressions']:>5} imps  {row['clicks']} clicks  pos {row['position']:.1f}")

# 4. Top pages
print("\n=== Top Pages (last 7d) ===")
r_pages = service.searchanalytics().query(
    siteUrl=site_url,
    body={"startDate": fmt_date(week_ago), "endDate": fmt_date(today), "dimensions": ["page"], "rowLimit": 10}
).execute()
for row in r_pages.get("rows", []):
    page = row["keys"][0][:60]
    print(f"  {page:62s}  {row['impressions']:>5} imps  {row['clicks']} clicks")

# 5. Sitemap index coverage
print("\n=== Sitemaps & Index Coverage ===")
sitemaps = service.sitemaps().list(siteUrl=site_url).execute()
for sm in sitemaps.get("sitemap", []):
    path = sm.get("path", "")
    submitted = sm.get("count", "?")
    indexed = sm.get("errors", "?")  # not quite right
    print(f"  {path:55s}  submitted: {sm.get('count','?'):>5}  indexed: {sm.get('errors','?'):>5}")

# 6. URL Inspection for key pages
print("\n=== URL Inspection ===")
test_urls = [
    "https://www.eventurer.online",
    "https://www.eventurer.online/cities",
    "https://www.eventurer.online/artists",
    "https://www.eventurer.online/event/london--wray-nephew-sunda",
    "https://www.eventurer.online/event/london-forward-motion-in-",
    "https://www.eventurer.online/event/berlin-tropic-disco-sound",
]
for u in test_urls:
    try:
        insp = service.urlInspection().index().inspect(
            body={"inspectionUrl": u, "siteUrl": site_url}
        ).execute()
        result = insp.get("inspectionResult", {})
        idx_status = result.get("indexStatusResult", {})
        verdict = idx_status.get("verdict", "N/A")
        coverage = idx_status.get("coverageState", "N/A")
        print(f"  {u:50s}  verdict: {verdict:15s}  coverage: {coverage}")
    except Exception as e:
        print(f"  {u:50s}  Error: {e}")

# 7. Check index coverage status (errors, warnings)
print("\n=== Index Coverage Summary ===")
try:
    cv = service.sites().get(siteUrl=site_url).execute()
    print(f"  {json.dumps(cv, indent=2)[:500]}")
except Exception as e:
    print(f"  Error: {e}")
