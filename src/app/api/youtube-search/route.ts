import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " dj set")}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube search results. Status: ${response.status}`);
    }

    const html = await response.text();

    // 1. Primary parsing method: extract the ytInitialData JSON object injected in the page
    const ytDataMatch = html.match(/ytInitialData\s*=\s*({.+?});/);
    if (ytDataMatch) {
      try {
        const data = JSON.parse(ytDataMatch[1]);
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
        
        if (contents && Array.isArray(contents)) {
          // Find the first actual video item in the search results
          const firstVideo = contents.find((item: any) => item.videoRenderer);
          if (firstVideo?.videoRenderer?.videoId) {
            const titleText = firstVideo.videoRenderer.title?.runs?.[0]?.text || 
                              firstVideo.videoRenderer.title?.accessibility?.accessibilityData?.label || "";
            return NextResponse.json({ 
              videoId: firstVideo.videoRenderer.videoId,
              title: titleText
            });
          }
        }
      } catch (parseError) {
        console.warn("ytInitialData JSON parse failed, falling back to regex extraction");
      }
    }

    // 2. Secondary fallback method: Regex search for watch URLs in the raw HTML
    const videoIdMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (videoIdMatch) {
      return NextResponse.json({ videoId: videoIdMatch[1], title: "" });
    }

    return NextResponse.json({ error: "No video found on YouTube" }, { status: 404 });
  } catch (error: any) {
    console.error("YouTube search scraper API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
