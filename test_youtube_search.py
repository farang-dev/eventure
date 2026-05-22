import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
from youtubesearchpython import VideosSearch

# Load environment variables
load_dotenv()
if not os.environ.get("NEXT_PUBLIC_SUPABASE_URL"):
    load_dotenv(dotenv_path=".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
# Use service role key if available, otherwise anon key
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase environment variables not found.")
    print("Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.")
    sys.exit(1)

def get_vilnius_artists():
    try:
        print("Connecting to Supabase...")
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Query music events in Vilnius
        print("Fetching music events for Vilnius...")
        response = supabase.table("music_events") \
            .select("title, artists, starts_at") \
            .eq("city", "vilnius") \
            .order("starts_at", desc=True) \
            .limit(20) \
            .execute()
            
        events = response.data
        if not events:
            print("No events found for Vilnius in the database.")
            return []
        
        print(f"Found {len(events)} events in Vilnius.")
        
        # Extract unique artists
        unique_artists = set()
        for event in events:
            artists_list = event.get("artists", [])
            if artists_list:
                for artist in artists_list:
                    # Clean up name if empty or just whitespace
                    name = artist.strip() if artist else ""
                    if name and name.lower() != "tba":
                        unique_artists.add(name)
                        
        print(f"Extracted {len(unique_artists)} unique artists.")
        return list(unique_artists)
    except Exception as e:
        print(f"Supabase connection failed ({e}). Falling back to local Vilnius artists.")
        return ["Manfredas", "Roe Deers", "Saulty", "Anna Hanna", "Vidis"]

def search_youtube_set(artist_name):
    query = f"{artist_name} dj set"
    print(f"Searching YouTube for: \"{query}\" ...")
    
    try:
        # Limit to 1 result to be super-efficient
        videos_search = VideosSearch(query, limit=1)
        results = videos_search.result()
        
        if results and results.get("result"):
            video = results["result"][0]
            video_title = video.get("title")
            video_id = video.get("id")
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            embed_url = f"https://www.youtube.com/embed/{video_id}"
            duration = video.get("duration")
            view_count = video.get("viewCount", {}).get("text", "N/A")
            
            return {
                "artist": artist_name,
                "video_title": video_title,
                "video_url": video_url,
                "embed_url": embed_url,
                "duration": duration,
                "views": view_count,
                "status": "success"
            }
        else:
            return {"artist": artist_name, "status": "no_results"}
    except Exception as e:
        return {"artist": artist_name, "status": "error", "error": str(e)}

def main():
    artists = get_vilnius_artists()
    
    if not artists:
        # Fallback to test artists if DB is empty of Vilnius events
        print("Using fallback test artists for Vilnius...")
        artists = ["Saulty", "Anna Hanna", "Manfredas", "Vidis", "Roe Deers"]
        
    # Let's test first 5 artists to see how it works quickly
    test_artists = artists[:5]
    print(f"\n--- Testing YouTube automated retrieval for {len(test_artists)} artists ---")
    
    results = []
    for artist in test_artists:
        res = search_youtube_set(artist)
        results.append(res)
        print(f"  Result: {res.get('status')}")
        if res.get("status") == "success":
            print(f"    └─ Found: \"{res['video_title']}\" ({res['duration']})")
            print(f"    └─ Embed URL: {res['embed_url']}")
        print()
        
    print("--- Done ---")

if __name__ == "__main__":
    main()
