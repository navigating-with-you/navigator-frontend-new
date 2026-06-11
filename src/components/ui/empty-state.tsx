import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: ReactNode;
    className?: string;
    testId?: string;
    children?: ReactNode;
}

export default function UnifiedEmptyState({
    title = "No Data Found",
    description = "No items have been added yet.",
    icon,
    className,
    testId = "empty-state",
    children,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex h-full w-full flex-col items-center justify-center rounded-[16px] bg-[#F6F7F2] dark:bg-zinc-900/40 px-6 py-12 text-center",
                className
            )}
            data-testid={testId}
        >
            {icon && (
                <div className="mb-4 text-[#60646B] dark:text-zinc-400">
                    {icon}
                </div>
            )}

            <h3 className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-200">
                {title}
            </h3>

            <p className="mt-2 text-[13px] text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                {description}
            </p>

            {children && (
                <div className="mt-5">
                    {children}
                </div>
            )}
        </div>
    );
}
