"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Masque le contenu visuellement tout en le gardant accessible aux lecteurs d'écran.
 * Utilisé pour DialogTitle, etc. quand on veut un titre sémantique sans l'afficher.
 */
const VisuallyHidden = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
      "[clip:rect(0,0,0,0)]",
      className
    )}
    {...props}
  />
));
VisuallyHidden.displayName = "VisuallyHidden";

export { VisuallyHidden };
