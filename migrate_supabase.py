"""
Supabase data migration: old project -> new project
Auto-detects schema mismatches and strips unknown columns.
"""

import requests
import json
import re
import time

# ── OLD PROJECT ──────────────────────────────────────────────────────────────
OLD_URL = "https://doftmyfsoubiwotqptag.supabase.co"
OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZnRteWZzb3ViaXdvdHFwdGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA4NzkyOSwiZXhwIjoyMDkzNjYzOTI5fQ.oHiFTqP84TrpL83mX0IJjjCkx6eb_Ql_83hCA3QpeHI"

# ── NEW PROJECT ──────────────────────────────────────────────────────────────
NEW_URL = "https://lsvwowkrhzwqeoovpzih.supabase.co"
NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzdndvd2tyaHp3cWVvb3ZwemloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk1MTgwMCwiZXhwIjoyMDk1NTI3ODAwfQ.T5cymjP3gSplRK2-jnM97Y0p2a-8vZyc3eVSG3bX8e4"

TABLE = "music_events"
BATCH_SIZE = 500

def headers(key):
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

def fetch_all_rows():
    """Paginate through all rows in old project."""
    all_rows = []
    offset = 0
    print("📥 Fetching from old project...")

    while True:
        end = offset + BATCH_SIZE - 1
        resp = requests.get(
            f"{OLD_URL}/rest/v1/{TABLE}",
            headers={
                **headers(OLD_KEY),
                "Range": f"{offset}-{end}",
                "Prefer": "count=exact",
            },
            params={"select": "*", "order": "created_at.asc"},
        )

        if resp.status_code not in (200, 206):
            print(f"❌ Fetch error {resp.status_code}: {resp.text}")
            break

        rows = resp.json()
        if not rows:
            break

        all_rows.extend(rows)
        print(f"   fetched {len(all_rows)} rows so far...")

        content_range = resp.headers.get("Content-Range", "")
        if "/" in content_range:
            total = content_range.split("/")[1]
            if total != "*" and len(all_rows) >= int(total):
                break

        if len(rows) < BATCH_SIZE:
            break

        offset += BATCH_SIZE
        time.sleep(0.2)

    return all_rows

def probe_new_schema(sample_row):
    """
    Try inserting a single test row to detect which columns are missing.
    Returns a set of columns to STRIP.
    """
    strip_cols = set()
    test = dict(sample_row)

    while True:
        resp = requests.post(
            f"{NEW_URL}/rest/v1/{TABLE}",
            headers={**headers(NEW_KEY), "Prefer": "resolution=ignore-duplicates,return=minimal"},
            json=[test],
        )
        if resp.status_code in (200, 201):
            print(f"   ✅ Schema probe passed. Stripped columns: {strip_cols or 'none'}")
            return strip_cols

        body = resp.json() if resp.text else {}
        msg = body.get("message", "")
        # Extract missing column name from error like:
        # "Could not find the 'is_approved' column of 'music_events' in the schema cache"
        match = re.search(r"Could not find the '(.+?)' column", msg)
        if match:
            col = match.group(1)
            print(f"   ⚠️  Column '{col}' not in new schema — stripping it")
            strip_cols.add(col)
            for key in list(test.keys()):
                if key == col:
                    del test[key]
                    break
        else:
            print(f"   ❌ Unknown error during probe: {resp.status_code} {resp.text[:200]}")
            return strip_cols  # give up probing

def filter_rows(rows, strip_cols):
    if not strip_cols:
        return rows
    return [{k: v for k, v in row.items() if k not in strip_cols} for row in rows]

def insert_rows(rows, strip_cols):
    """Insert rows into new project in batches, ignoring duplicates."""
    total = len(rows)
    inserted = 0
    errors = 0

    print(f"\n📤 Inserting {total} rows into new project...")

    for i in range(0, total, BATCH_SIZE):
        batch = filter_rows(rows[i : i + BATCH_SIZE], strip_cols)

        resp = requests.post(
            f"{NEW_URL}/rest/v1/{TABLE}",
            headers={
                **headers(NEW_KEY),
                "Prefer": "resolution=ignore-duplicates,return=minimal",
            },
            json=batch,
        )

        if resp.status_code in (200, 201):
            inserted += len(batch)
            print(f"   ✅ batch {i//BATCH_SIZE + 1} ({inserted}/{total})")
        else:
            errors += len(batch)
            print(f"   ❌ batch {i//BATCH_SIZE + 1} error {resp.status_code}: {resp.text[:300]}")

        time.sleep(0.3)

    return inserted, errors

def verify(expected):
    resp = requests.get(
        f"{NEW_URL}/rest/v1/{TABLE}",
        headers={**headers(NEW_KEY), "Prefer": "count=exact"},
        params={"select": "id", "limit": "1"},
    )
    cr = resp.headers.get("Content-Range", "?/?")
    total_new = cr.split("/")[-1] if "/" in cr else "?"
    print(f"\n🔍 Verification: new project has {total_new} rows (expected ≥{expected})")

if __name__ == "__main__":
    rows = fetch_all_rows()
    print(f"\nTotal rows to migrate: {len(rows)}")

    if not rows:
        print("No rows found — check old project credentials.")
        exit(1)

    print("\n🔬 Probing new project schema...")
    strip_cols = probe_new_schema(rows[0])

    if strip_cols:
        print(f"   → Will strip these columns from all rows: {strip_cols}")
        print(f"   → NOTE: Add these columns to new project later via SQL editor")

    inserted, errors = insert_rows(rows, strip_cols)
    verify(inserted)

    print(f"\n{'='*50}")
    print(f"✅ Migration complete: {inserted} inserted, {errors} errors")
    if strip_cols:
        print(f"\n⚠️  Stripped columns: {strip_cols}")
        print(f"   Run this in new project SQL editor:")
        for col in strip_cols:
            print(f"   ALTER TABLE music_events ADD COLUMN IF NOT EXISTS {col} boolean default null;")
    print(f"{'='*50}")
