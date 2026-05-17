export interface CityInfo {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  areaId: number;
  eventCount?: number;
}

export const CITIES: CityInfo[] = [
  { id: "tokyo", name: "Tokyo", country: "Japan", lat: 35.6580, lng: 139.7016, areaId: 27 },
  { id: "osaka", name: "Osaka", country: "Japan", lat: 34.6937, lng: 135.5023, areaId: 66 },
  { id: "london", name: "London", country: "UK", lat: 51.5074, lng: -0.1278, areaId: 13 },
  { id: "vilnius", name: "Vilnius", country: "Lithuania", lat: 54.6872, lng: 25.2797, areaId: 561 },
  { id: "belgrade", name: "Belgrade", country: "Serbia", lat: 44.8125, lng: 20.4612, areaId: 562 },
  { id: "tbilisi", name: "Tbilisi", country: "Georgia", lat: 41.7151, lng: 44.8271, areaId: 188 },
  { id: "berlin", name: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050, areaId: 34 },
  { id: "new-york", name: "New York", country: "USA", lat: 40.7128, lng: -74.0060, areaId: 8 },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041, areaId: 29 },
  { id: "paris", name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, areaId: 44 },
  { id: "barcelona", name: "Barcelona", country: "Spain", lat: 41.3874, lng: 2.1686, areaId: 20 },
];

export const CITY_META: Record<string, { description: string; keywords: string[] }> = {
  tokyo: {
    description: "Discover the best techno, house & club events in Tokyo. Live map of Shibuya, Roppongi, and underground parties.",
    keywords: ["Tokyo club events", "Tokyo techno", "Shibuya parties", "Roppongi nightlife", "Tokyo rave map"],
  },
  osaka: {
    description: "Find club nights, techno parties & live music in Osaka. Real-time event map for Namba, Umeda & Shinsaibashi.",
    keywords: ["Osaka club events", "Osaka techno", "Namba nightlife", "Osaka music events", "Kansai rave"],
  },
  london: {
    description: "London club events & underground parties on a live map. Techno, house, D&B in Shoreditch, Fabric, and more.",
    keywords: ["London club events", "London techno", "Shoreditch parties", "Fabric London", "UK rave map"],
  },
  vilnius: {
    description: "Vilnius club nights & electronic music events. Discover techno, house & underground parties in Lithuania.",
    keywords: ["Vilnius club events", "Vilnius techno", "Lithuania nightlife", "Vilnius parties", "Baltic rave"],
  },
  belgrade: {
    description: "Belgrade club scene & electronic music map. Find techno, house & Balkan underground parties in Serbia.",
    keywords: ["Belgrade club events", "Belgrade techno", "Serbia nightlife", "Belgrade parties", "Balkan rave"],
  },
  tbilisi: {
    description: "Tbilisi club events & electronic music map. Discover techno, house & underground parties in Georgia.",
    keywords: ["Tbilisi club events", "Tbilisi techno", "Georgia nightlife", "Tbilisi parties", "Caucasus rave"],
  },
  berlin: {
    description: "Berlin techno & club events on a live map. Berghain, Tresor, Sisyphos — find the best parties in the techno capital.",
    keywords: ["Berlin club events", "Berlin techno", "Berghain", "Berlin nightlife", "Germany rave map"],
  },
  "new-york": {
    description: "New York City club events & electronic music map. Techno, house, D&B in Brooklyn, Manhattan & beyond.",
    keywords: ["NYC club events", "New York techno", "Brooklyn parties", "NYC nightlife", "US rave map"],
  },
  amsterdam: {
    description: "Amsterdam club nights & electronic music events. Discover techno, house & underground parties in the Dutch capital.",
    keywords: ["Amsterdam club events", "Amsterdam techno", "ADE", "Amsterdam nightlife", "Netherlands rave"],
  },
  paris: {
    description: "Paris club events & electronic music map. Find techno, house & underground parties in the City of Light.",
    keywords: ["Paris club events", "Paris techno", "Paris nightlife", "France electronic music", "Paris rave map"],
  },
  barcelona: {
    description: "Barcelona club events & electronic music map. Discover techno, house & beach parties on the Mediterranean coast.",
    keywords: ["Barcelona club events", "Barcelona techno", "Barcelona nightlife", "Spain electronic music", "Barcelona rave"],
  },
};
