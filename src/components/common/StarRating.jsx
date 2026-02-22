import React from "react";
import { Star } from "lucide-react";

export default function StarRating({ rating, onRate, size = "md", readOnly = false }) {
  const [hover, setHover] = React.useState(0);
  const sizes = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-7 h-7" };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={`${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
        >
          <Star
            className={`${s} transition-colors ${
              star <= (hover || rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
