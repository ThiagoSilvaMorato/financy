export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  label: string;
  placeholder: string;
  defaultValue?: string;
  value?: string;
  options: SelectOption[];
  onSelect?: (value: string) => void;
  error?: string;
}
