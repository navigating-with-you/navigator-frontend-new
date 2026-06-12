import React from "react";
import { cn } from "@/lib/utils";

interface PageActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  "data-tour"?: string;
  "data-testid"?: string;
}

/**
 * Card-style action button used in page toolbars.
 * Always horizontal: circled icon on the left, label on the right.
 * Sizes itself naturally from padding — no hardcoded width/height.
 */
export function PageActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  className,
  ...rest
}: PageActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={cn(
        // Mobile: compact; Desktop (sm+): full size
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
        "sm:gap-3 sm:px-5 sm:py-3 sm:rounded-xl sm:text-sm",
        // Border & background
        "border border-surface-sidebar dark:border-zinc-700 bg-surface-page dark:bg-zinc-900",
        // Text — responsive weight
        "font-normal text-zinc-600 dark:text-zinc-400",
        // Transitions
        "transition-all duration-150",
        // Hover / active — only when enabled
        !disabled && [
          "hover:border-zinc-300 dark:hover:border-zinc-600",
          "hover:bg-zinc-50 dark:hover:bg-zinc-800",
          "hover:shadow-sm",
          "active:scale-[0.98]",
          "cursor-pointer",
        ],
        // Disabled state
        disabled && "opacity-[0.65] cursor-not-allowed",
        className
      )}
    >
      {/* Icon — plain, no circle */}
      <span className="flex items-center justify-center shrink-0 text-zinc-500 dark:text-zinc-400">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
