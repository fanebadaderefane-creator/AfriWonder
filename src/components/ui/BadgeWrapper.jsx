import { cn } from "@/lib/utils";

export function Badge({ children, variant = "default", size = "sm", className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        variant === "default" && "bg-gradient-to-r from-orange-100 to-pink-100 text-orange-800",
        variant === "success" && "bg-emerald-100 text-emerald-800",
        variant === "warning" && "bg-amber-100 text-amber-800",
        variant === "error" && "bg-red-100 text-red-800",
        variant === "info" && "bg-blue-100 text-blue-800",
        variant === "outline" && "border border-gray-300 text-gray-700 bg-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}
