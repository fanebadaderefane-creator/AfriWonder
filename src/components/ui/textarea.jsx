import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Textarea = React.forwardRef(
  ({ className, id, label, labelClassName, "aria-label": ariaLabel, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    const area = (
      <textarea
        id={inputId}
        className={cn(
          "flex min-h-[80px] w-full rounded-2xl border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-[background-color,color,border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        aria-label={ariaLabel}
        {...props}
      />
    );

    if (!label) {
      return area;
    }

    return (
      <div className="grid w-full gap-1.5">
        <Label htmlFor={inputId} className={cn(labelClassName)}>
          {label}
        </Label>
        {area}
      </div>
    );
  }
);
Textarea.displayName = "Textarea"

export { Textarea }
