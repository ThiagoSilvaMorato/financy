import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { CustomSelectProps } from "./models";

export const CustomSelect = ({
  label,
  placeholder,
  options,
  defaultValue,
  value,
  onSelect,
  error,
}: CustomSelectProps) => {
  return (
    <>
      <div className='flex flex-col space-y-1'>
        <Label htmlFor='custom-select' className='mb-2'>
          {label}
        </Label>
        <div id='custom-select'>
          <Select
            defaultValue={defaultValue}
            value={value}
            onValueChange={(value: string) => {
              if (onSelect) onSelect(value);
            }}
          >
            <SelectTrigger className={`${error ? "border border-red-500" : ""}`}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <span className='text-sm text-red-500'>{error}</span>
        </div>
      </div>
    </>
  );
};
