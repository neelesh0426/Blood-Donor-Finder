import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "crimson"
    | "success"
    | "warning"
    | "destructive"
    | "outline"
    | "neutral"
    | "secondary"
    | "demo";
  size?: "sm" | "md" | "lg";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-rose-50 text-red-900 border-rose-200",
    crimson: "bg-red-800 text-white border-transparent shadow-xs",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    destructive: "bg-red-50 text-red-800 border-red-200",
    outline: "bg-transparent text-stone-700 border-stone-300",
    neutral: "bg-stone-100 text-stone-700 border-stone-200",
    secondary: "bg-stone-100 text-stone-700 border-stone-200",
    demo: "bg-purple-50 text-purple-800 border-purple-200 font-mono",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 font-medium rounded-md",
    md: "text-xs px-2.5 py-1 font-semibold rounded-lg",
    lg: "text-xs px-3 py-1.5 font-bold rounded-lg",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border leading-none transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
