import React from "react";

interface DividerProps {
  text?: string;
  children?: React.ReactNode;
  className?: string;
  align?: "center" | "left" | "right";
  thickness?: number; // px
  color?: string;
  margin?: string | number;
}

const Divider = ({
  text,
  children,
  className = "",
  align = "center",
  thickness = 1,
  color = "#e0e0e0",
  margin,
}: DividerProps) => {
  const label = text ?? (typeof children === "string" ? children : undefined);

  const justifyClass =
    align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";

  const rootClasses = `divider ${className} flex items-center gap-3 ${justifyClass}`.trim();

  return (
    <div
      className={rootClasses}
      role='separator'
      aria-orientation='horizontal'
      style={margin !== undefined ? { margin } : undefined}
    >
      {label ? (
        <>
          {align !== "left" && (
            <div className='flex-1 rounded' style={{ height: thickness, background: color }} />
          )}
          <span className='text-gray-500 text-sm'>{label}</span>
          {align !== "right" && (
            <div className='flex-1 rounded' style={{ height: thickness, background: color }} />
          )}
        </>
      ) : (
        <div className='w-full rounded' style={{ height: thickness, background: color }} />
      )}
    </div>
  );
};

export default Divider;
