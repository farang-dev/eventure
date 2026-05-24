export function createSlug(title: string | null | undefined, city: string | null | undefined): string {
  const t = title || "event";
  const c = city || "various";
  return `${c}-${t}`
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') 
    .replace(/[\s_]+/g, '-')  
    .replace(/^-+|-+$/g, ''); 
}

export function createEventUrl(title: string | null | undefined, city: string | null | undefined): string {
  const fullSlug = createSlug(title, city || "various");
  const cityPart = (city || "various").toLowerCase().replace(/\s+/g, "-");
  const titlePart = fullSlug.slice(cityPart.length + 1);
  return `/events/${cityPart}/${titlePart}`;
}
