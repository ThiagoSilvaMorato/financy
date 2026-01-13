import { Button } from "@/components/ui/button";
import { colors } from "../../constants/colors";
import { Label } from "@/components/ui/label";
import { handleColorMap } from "@/utils/colorMap";

interface ColorSelectionProps {
  value: string;
  setValue: (icon: string) => void;
  error?: string | null;
}

export const ColorSelection = ({ value, setValue, error }: ColorSelectionProps) => {
  return (
    <div className='w-full flex flex-col gap-2 mb-4'>
      <Label htmlFor='colors'>Cor</Label>
      <div
        id='colors'
        className={`grid grid-cols-7 gap-2 justify-items-center ${
          error ? "border border-red-500 p-2 rounded-md" : ""
        }`}
      >
        {colors.map((color) => (
          <Button
            key={color}
            variant='outline'
            onClick={() => setValue?.(color)}
            className={`w-full p-[5px] ${value === color ? "border border-black" : ""}`}
          >
            <div
              className='w-full h-full rounded-sm'
              style={handleColorMap(color, true).bgStyle}
            ></div>
          </Button>
        ))}
      </div>
      <span className='text-sm text-red-500'>{error}</span>
    </div>
  );
};
