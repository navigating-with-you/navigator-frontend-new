import {
    ChevronDown,
    Check,
    X,
} from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { type JSX } from "react";
import { cn } from "@/lib/utils";

type FilterDropdownProps = {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    testId?: string;
};

export default function FilterDropdown({
    label,
    value,
    options,
    onChange,
    testId,
}: FilterDropdownProps): JSX.Element {
    return (
        <div className="group flex items-center gap-0 rounded-md border border-surface-sidebar dark:border-zinc-700 bg-surface-page dark:bg-zinc-800 hover:bg-[#FEFFFA]/80 transition-colors h-6 shadow-sm">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        data-testid={testId}
                        className="flex items-center gap-1 px-2.5 h-full text-xs text-zinc-600 dark:text-zinc-400 outline-none cursor-pointer"
                    >
                        <span className={cn("transition-colors", value ? "font-medium text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400")}>
                            {value || label}
                        </span>
                        {!value && <ChevronDown className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />}
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="start"
                    className="w-44"
                >
                    {options.length === 0 ? (
                        <div className="py-3 px-3 text-xs text-zinc-500 dark:text-zinc-400 text-center italic">
                            No matching items
                        </div>
                    ) : (
                        options.map((opt) => (
                            <DropdownMenuItem
                                key={opt}
                                data-testid={testId ? `${testId}-option-${opt
                                    .toLowerCase()
                                    .replace(/\s+/g, "-")}` : undefined}
                                onClick={() => onChange(opt)}
                                className="flex items-center justify-between text-xs"
                            >
                                <span className="capitalize">
                                    {opt}
                                </span>

                                {value === opt && (
                                    <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {value && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onChange("");
                    }}
                    className="flex items-center pr-2 h-full text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                    aria-label="Clear filter"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}