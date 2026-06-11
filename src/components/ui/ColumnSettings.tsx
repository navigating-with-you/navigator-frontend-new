import { useState, useEffect } from "react";
import { Columns3 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface ColumnOption {
    key: string;
    label: string;
}

interface ColumnSettingsProps {
    columns: ColumnOption[];
    visibleColumns: string[];
    onApply: (visibleKeys: string[]) => void;
    defaultColumns: string[];
    align?: "start" | "center" | "end";
}

export default function ColumnSettings({
    columns,
    visibleColumns,
    onApply,
    defaultColumns,
    align = "end",
}: ColumnSettingsProps) {
    const [open, setOpen] = useState(false);

    // Screen width state for responsive limits
    const [isBiggerScreen, setIsBiggerScreen] = useState(
        typeof window !== "undefined" ? window.innerWidth > 1440 : true
    );

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleResize = () => {
            setIsBiggerScreen(window.innerWidth > 1440);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const maxAllowed = isBiggerScreen ? 7 : 5;

    const [tempVisible, setTempVisible] = useState<Set<string>>(new Set(visibleColumns));

    // Reset local state when popover opens or visibleColumns/maxAllowed changes
    useEffect(() => {
        if (open) {
            const truncated = visibleColumns.slice(0, maxAllowed);
            setTempVisible(new Set(truncated));
            if (truncated.length < visibleColumns.length) {
                onApply(truncated);
            }
        }
    }, [open, visibleColumns, maxAllowed]);

    const handleToggleColumn = (key: string, checked: boolean | "indeterminate") => {
        setTempVisible((prev) => {
            const next = new Set(prev);
            if (checked === true) {
                if (next.size < maxAllowed) {
                    next.add(key);
                }
            } else {
                next.delete(key);
            }
            return next;
        });
    };

    const handleReset = () => {
        const resetCols = defaultColumns.slice(0, maxAllowed);
        setTempVisible(new Set(resetCols));
        onApply(resetCols);
        setOpen(false);
    };

    const handleApply = () => {
        onApply(Array.from(tempVisible).slice(0, maxAllowed));
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="flex items-center gap-1.5 h-6 px-2.5 rounded-md border-[#E7E7E0] dark:border-zinc-700 bg-[#FEFFFA] dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-normal hover:bg-[#F5F5F0] dark:hover:bg-zinc-800 shadow-sm"
                >
                    <Columns3 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                    Column Settings
                </Button>
            </PopoverTrigger>
            <PopoverContent align={align} className="w-60 p-0 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl shadow-lg">
                {/* Column Limit Info */}
                <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 select-none">
                        Max {maxAllowed} columns
                    </span>
                </div>

                {/* Columns List */}
                <div className="max-h-64 overflow-y-auto py-1">
                    {columns.map((col) => {
                        const isChecked = tempVisible.has(col.key);
                        const isCheckboxDisabled = !isChecked && tempVisible.size >= maxAllowed;
                        return (
                            <div
                                key={col.key}
                                className={`flex items-center gap-3 px-4 py-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 ${isCheckboxDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                                onClick={() => !isCheckboxDisabled && handleToggleColumn(col.key, !isChecked)}
                            >
                                <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => handleToggleColumn(col.key, checked)}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={isCheckboxDisabled}
                                />
                                <span className="text-sm text-zinc-655 dark:text-zinc-400 select-none">
                                    {col.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="border-b border-zinc-100 dark:border-zinc-800" />

                {/* Footer Actions */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-b-xl">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                        Apply
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
