import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  className,
  disabled,
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        variant === "primary" && "bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 hover:from-blue-600 hover:via-indigo-600 hover:to-indigo-700 text-white focus:ring-blue-500 shadow-sm",
        variant === "secondary" && "bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-400",
        variant === "outline" && "border-2 border-blue-500 text-blue-600 hover:bg-blue-50 focus:ring-blue-500",
        variant === "ghost" && "text-gray-700 hover:bg-gray-100 focus:ring-gray-400",
        variant === "danger" && "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
        variant === "success" && "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        iconPosition === "left" && icon
      )}
      {children}
      {!loading && iconPosition === "right" && icon}
    </button>
  );
}
