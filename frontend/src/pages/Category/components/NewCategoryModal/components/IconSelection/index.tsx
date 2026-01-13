import { Label } from "@/components/ui/label";
import { iconNames } from "../../constants/iconNames";
import { Button } from "@/components/ui/button";
import { getLucideIcon } from "@/utils/getLucideIcon";

interface IconSelectionProps {
  value: string;
  setValue: (icon: string) => void;
  error?: string | null;
}

export const IconSelection = ({ value, setValue, error }: IconSelectionProps) => {
  return (
    <div className='w-full flex flex-col gap-2'>
      <Label htmlFor='icons'>Ícone</Label>
      <div
        id='icons'
        className={`grid grid-cols-8 gap-2 justify-items-center ${
          error ? "border border-red-500 p-2 rounded-md" : ""
        }`}
      >
        {iconNames.map((iconName) => (
          <Button
            key={iconName}
            variant={value === iconName ? "default" : "outline"}
            onClick={() => setValue?.(iconName)}
            className='w-12 h-12'
          >
            {getLucideIcon(iconName, 30)}
          </Button>
        ))}
      </div>
      <span className='text-sm text-red-500'>{error}</span>
    </div>
  );
};
