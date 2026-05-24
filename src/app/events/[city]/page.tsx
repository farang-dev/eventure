import { permanentRedirect } from "next/navigation";

export default async function CityEventsPage(props: { params: Promise<{ city: string }> }) {
  const { city } = await props.params;
  permanentRedirect(`/${city.toLowerCase()}`);
}
