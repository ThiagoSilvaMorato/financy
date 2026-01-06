export interface SelectOption {
  label: string;
  value: string;
}

export interface ICustomSelectProps {
  label: string;
  placeholder: string;
  defaultValue?: string;
  options: SelectOption[];
}
