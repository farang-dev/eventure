import { permanentRedirect } from "next/navigation";

export default function OldCitiesRedirect() {
  permanentRedirect("/events/cities");
}
