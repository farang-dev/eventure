import { redirect } from "next/navigation";
import { CITIES } from "@/lib/constants";

export const revalidate = 60;

export async function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.id }));
}

export default async function OldCityRedirect(props: { params: Promise<{ city: string }> }) {
  const { city } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  if (!info) redirect("/404");
  redirect(`/events/${city}`);
}
