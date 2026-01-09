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
  error,
  ...props
}: ICustomInputProps) => {
  const { className, onChange, ...rest } = props;
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  const hasError = Boolean(error);

  const mergedClassName = [
    className,
    icon ? "pl-10" : null,
    isPassword ? "pr-10" : null,
    "h-12",
    hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (setValue) {
      setValue(e.target.value);
    } else if (onChange) {
      (onChange as (e: React.ChangeEvent<HTMLInputElement>) => void)(e);
    }
  };

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
          onChange={handleChange}
          className={mergedClassName}
          type={inputType}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
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

      {hasError ? (
        <p id={`${id}-error`} className='text-sm text-red-500 mt-1'>
          {error}
        </p>
      ) : (
        helperText && <p className='text-sm text-zinc-500 mt-1'>{helperText}</p>
      )}
    </div>
  );
};
