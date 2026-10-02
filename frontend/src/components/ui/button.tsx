import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "subtle";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none cursor-pointer";

    const variantStyles = {
      primary:
        "bg-red-800 text-white hover:bg-red-900 shadow-sm shadow-red-900/20 focus-visible:outline-red-800",
      secondary:
        "bg-rose-100 text-red-900 hover:bg-rose-200 focus-visible:outline-red-800",
      outline:
        "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 hover:border-stone-400 focus-visible:outline-red-800 shadow-xs",
      ghost:
        "text-stone-700 hover:bg-rose-50 hover:text-red-900 focus-visible:outline-red-800",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 shadow-xs focus-visible:outline-red-600",
      subtle:
        "bg-stone-100 text-stone-800 hover:bg-stone-200 focus-visible:outline-stone-500",
    };

    const sizeStyles = {
      sm: "h-9 px-3 text-xs min-h-[36px]",
      md: "h-11 px-4 text-sm min-h-[44px]", // Minimum 44px mobile touch target
      lg: "h-12 px-6 text-base min-h-[48px] font-semibold",
      icon: "h-11 w-11 min-h-[44px] min-w-[44px] p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
