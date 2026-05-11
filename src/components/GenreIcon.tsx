import {
  SlidersHorizontal, Disc3, Speaker, Radio, Mic2,
  Activity, Zap, Sparkles, Flame, Music, type LucideProps,
} from "lucide-react";
import type { GenreIconName } from "@/lib/mock-data";

const ICON_MAP: Record<GenreIconName, React.FC<LucideProps>> = {
  SlidersHorizontal,
  Disc3,
  Speaker,
  Radio,
  Mic2,
  Activity,
  Zap,
  Sparkles,
  Flame,
  Music,
};

interface Props extends LucideProps {
  name: GenreIconName;
}

export default function GenreIcon({ name, ...props }: Props) {
  const Icon = ICON_MAP[name] ?? Music;
  return <Icon {...props} />;
}
