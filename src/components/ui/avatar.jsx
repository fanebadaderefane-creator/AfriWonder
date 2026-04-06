"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef(/** @param {{ className?: string, children?: React.ReactNode, [k: string]: any }} props */ ({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props} />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef(
  /** @param {{ className?: string, src?: string, alt?: string, loading?: "eager" | "lazy", decoding?: "auto" | "async" | "sync", fetchPriority?: string, [k: string]: any }} props */
  (
    {
      className,
      // Defaults: lazy + async decoding to reduce main-thread work and CLS.
      loading,
      decoding,
      fetchPriority,
      ...props
    },
    ref
  ) => (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("aspect-square h-full w-full", className)}
      loading={loading ?? "lazy"}
      decoding={decoding ?? "async"}
      fetchpriority={fetchPriority ?? "auto"}
      {...props}
    />
  )
)
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef(/** @param {{ className?: string, children?: React.ReactNode, [k: string]: any }} props */ ({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props} />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
