import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useState } from "react";
import { Eye, EyeClosed } from "lucide-react";
import type { ICustomInputProps } from "./models";

export const CustomInput = ({
  id,
  value,
  setValue,
  label = "E-mail",
  icon,
  type = "text",
  helperText,
  ...props
}: ICustomInputProps) => {
  const { className, ...rest } = props;
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  const mergedClassName = [className, icon ? "pl-10" : null, isPassword ? "pr-10" : null, "h-12"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className='space-y-1'>
      <Label htmlFor={id}>{label}</Label>

      <div className='relative'>
        {icon && (
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none'>
            {icon}
          </span>
        )}

        <Input
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={mergedClassName}
          type={inputType}
          {...rest}
        />

        {isPassword && (
          <button
            type='button'
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400'
          >
            {showPassword ? <Eye size={18} color='black' /> : <EyeClosed size={18} color='black' />}
          </button>
        )}
      </div>

      {helperText && <p className='text-sm text-zinc-500 mt-1'>{helperText}</p>}
    </div>
  );
};
