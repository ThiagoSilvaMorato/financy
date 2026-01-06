import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { ICustomSelectProps } from "./models";

export const CustomSelect = ({ label, placeholder, options, defaultValue }: ICustomSelectProps) => {
  return (
    <>
      <div className='flex flex-col space-y-1'>
        <Label htmlFor='custom-select' className='mb-2'>
          {label}
        </Label>
        <div id='custom-select'>
          <Select defaultValue={defaultValue}>
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
};
