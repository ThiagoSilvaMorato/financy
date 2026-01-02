import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

interface ICustomCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export const CustomCheckbox = ({
  id,
  label,
  checked,
  onChange,
  className,
}: ICustomCheckboxProps) => {
  return (
    <div className='flex items-center space-x-2'>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(Boolean(v))}
        className={className ?? "ml-2"}
      />
      <Label htmlFor={id} className='hover:cursor-pointer font-normal'>
        {label}
      </Label>
    </div>
  );
};
