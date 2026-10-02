import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, label, helperText, id, icon: Icon, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-stone-700"
          >
            {label}
            {props.required && <span className="text-red-700 ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-stone-400">
              {typeof Icon === "function" ? <Icon className="h-4 w-4" /> : Icon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              "flex h-11 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-800 focus-visible:border-red-800 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]",
              Icon && "pl-10",
              error && "border-red-600 focus-visible:ring-red-600 focus-visible:border-red-600",
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
            {...props}
          />
        </div>
        {helperText && !error && (
          <p id={`${inputId}-help`} className="text-xs text-stone-500">
            {helperText}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600 font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
