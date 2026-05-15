export function createSlug(title: string | null | undefined, city: string | null | undefined): string {
  const t = title || "event";
  const c = city || "various";
  return `${c}-${t}`
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') 
    .replace(/[\s_]+/g, '-')  
    .replace(/^-+|-+$/g, ''); 
}
