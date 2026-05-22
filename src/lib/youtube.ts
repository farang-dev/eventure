export const VIDEO_MAP: Record<string, string> = {
  "manfredas": "TpgU8U09HmM",
  "roe deers": "yknu7gD5kqs",
  "saulty": "h0LfZkW3yqA",
  "anna hanna": "EVJIl98ZKko",
  "vidis": "0fStWP79Z5A",
};

export const EXPLORE_PLAY_DURATION = 600; // 10 minutes per DJ
export const EXPLORE_FADE_DURATION = 7;   // 7-second fade-out

export function checkTitleMatchesArtist(artistName: string, title: string): boolean {
  if (!title || !title.trim()) return false;
  const normalizedTitle = title.toLowerCase();
  const normalizedArtist = artistName.toLowerCase();
  if (normalizedTitle.includes(normalizedArtist)) return true;
  const artistWords = normalizedArtist
    .split(/[\s\-_|,&.]+/)
    .filter(w => w.length > 2 && !["the", "dj", "set", "mix", "live"].includes(w));
  if (artistWords.length > 0) {
    return artistWords.every(word => {
      const boundary = new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`);
      return boundary.test(normalizedTitle);
    });
  }
  return false;
}

export async function fetchVideoForArtist(
  artist: string
): Promise<{ videoId: string; reliable: boolean; title: string } | null> {
  const key = artist.replace(/[{}""'\[\]]/g, "").trim().toLowerCase();
  if (VIDEO_MAP[key]) return { videoId: VIDEO_MAP[key], reliable: true, title: artist };
  try {
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(artist)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.videoId) {
        const title = data.title || "";
        return { videoId: data.videoId, reliable: checkTitleMatchesArtist(artist, title), title };
      }
    }
  } catch (e) {}
  return null;
}
