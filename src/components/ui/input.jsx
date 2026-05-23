import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Input = React.forwardRef(
  ({ className, type, id, label, labelClassName, "aria-label": ariaLabel, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    const inputEl = (
      <input
        type={type}
        id={inputId}
        className={cn(
          "flex h-10 w-full rounded-2xl border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-[background-color,color,border-color,box-shadow] duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        aria-label={ariaLabel}
        {...props}
      />
    );

    if (!label) {
      return inputEl;
    }

    return (
      <div className="grid w-full gap-1.5">
        <Label htmlFor={inputId} className={cn(labelClassName)}>
          {label}
        </Label>
        {inputEl}
      </div>
    );
  }
);
Input.displayName = "Input"

export { Input }
