import { redirect } from "next/navigation";

export default function OldCitiesRedirect() {
  redirect("/events/cities");
}
