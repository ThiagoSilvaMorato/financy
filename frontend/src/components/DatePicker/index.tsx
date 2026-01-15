/* eslint-disable react-hooks/set-state-in-effect */
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import type { DatePickerProps } from "./models";
import { Calendar } from "../ui/calendar";
import { useState, useEffect } from "react";
import { Label } from "../ui/label";
import { format } from "date-fns";

export const DatePicker = ({ id, label, placeholder, onChange, value, error }: DatePickerProps) => {
  const [date, setDate] = useState<Date | undefined>(value ?? undefined);

  useEffect(() => {
    setDate(value ?? undefined);
  }, [value]);

  const [open, setOpen] = useState(false);

  return (
    <div className='space-y-1'>
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant='outline'
            data-empty={!date}
            className={`data-[empty=true]:text-muted-foreground w-full h-12 justify-start text-left font-normal ${
              error ? "border border-red-500" : ""
            }`}
          >
            <CalendarIcon />
            {date ? format(date, "dd/MM/yyyy") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0'>
          <Calendar
            mode='single'
            selected={date}
            onSelect={(e) => {
              const selected = e ?? undefined;
              setDate(selected);
              onChange(selected);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <span className='text-sm text-red-500'>{error}</span>
    </div>
  );
};
