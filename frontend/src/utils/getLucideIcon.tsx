import { type ReactNode } from "react";
import * as LucideIcons from "lucide-react";

export const getLucideIcon = (name?: string): ReactNode | null => {
  if (!name) return <LucideIcons.CircleQuestionMark size={18} />;

  const IconComp = (LucideIcons as any)[name];
  return IconComp ? <IconComp size={18} /> : <LucideIcons.CircleQuestionMark size={18} />;
};
