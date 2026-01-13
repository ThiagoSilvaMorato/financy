import { type ReactNode } from "react";
import * as LucideIcons from "lucide-react";

export const getLucideIcon = (name?: string, size = 18): ReactNode | null => {
  if (!name) return <LucideIcons.CircleQuestionMark size={size} />;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComp = (LucideIcons as any)[name];
  return IconComp ? <IconComp size={size} /> : <LucideIcons.CircleQuestionMark size={size} />;
};
