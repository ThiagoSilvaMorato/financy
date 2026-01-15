export interface DatePickerProps {
  id?: string;
  value?: Date | null;
  onChange: (date: Date | undefined) => void;
  label: string;
  placeholder?: string;
  error?: string;
}
