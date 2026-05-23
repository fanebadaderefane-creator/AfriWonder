import { cn } from "@/lib/utils";

export function Card({ children, className, onClick, hover = false, padding = "md" }) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm",
        hover && "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
        onClick && "cursor-pointer",
        padding === "none" && "p-0",
        padding === "sm" && "p-3",
        padding === "md" && "p-4",
        padding === "lg" && "p-6",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
