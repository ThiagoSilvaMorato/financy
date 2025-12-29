import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

interface ICustomCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}

export const CustomCheckbox = ({ id, label }: ICustomCheckboxProps) => {
  return (
    <div className='flex items-center space-x-2'>
      <Checkbox id={id} className='ml-2' />
      <Label htmlFor={id} className='hover:cursor-pointer font-normal'>
        {label}
      </Label>
    </div>
  );
};
