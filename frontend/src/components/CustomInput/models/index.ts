import type { Dispatch, InputHTMLAttributes, ReactNode, SetStateAction } from "react";

export interface ICustomInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  value?: string;
  setValue?: Dispatch<SetStateAction<string>>;
  label?: ReactNode;
  icon?: ReactNode;
  helperText?: ReactNode;
  error?: string | null;
}
