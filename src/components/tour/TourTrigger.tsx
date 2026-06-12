import { useState, useRef, useEffect, type JSX } from "react";
import { HelpCircle, Play, RotateCcw, CheckCircle2 } from "lucide-react";
import { useTour } from "@/contexts/TourContext";
import { TOURS } from "@/tours/tours";

export function TourTrigger(): JSX.Element {
    const { startTour, completedTours, resetTours } = useTour();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                !menuRef.current?.contains(e.target as Node) &&
                !buttonRef.current?.contains(e.target as Node)
            ) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open]);

    const allCompleted = TOURS.every((t) => completedTours.has(t.id));
    const hasNew = TOURS.some((t) => !completedTours.has(t.id));

    return (
        <div className="relative">
            {/* Trigger button — blue-themed to match app */}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Guided tours"
                aria-expanded={open}
                data-tour="tour-trigger"
                className="relative flex items-center justify-center h-8 w-8 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
                <HelpCircle className="h-4 w-4" />
                {/* New-tour indicator dot */}
                {hasNew && (
                    <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-zinc-900" />
                )}
            </button>

            {open && (
                <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-2 w-76 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden"
                    style={{ width: 296 }}
                >
                    {/* Blue accent bar */}
                    <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 to-blue-600" />

                    {/* Header */}
                    <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Guided Tours</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Learn Navigator step by step
                        </p>
                    </div>

                    {/* Tour list */}
                    <div className="p-2 space-y-1">
                        {TOURS.map((tour) => {
                            const done = completedTours.has(tour.id);
                            return (
                                <button
                                    key={tour.id}
                                    type="button"
                                    onClick={() => {
                                        setOpen(false);
                                        startTour(tour.id);
                                    }}
                                    className="w-full flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-blue-50/70 dark:hover:bg-blue-900/10 transition-colors text-left group"
                                >
                                    <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full shrink-0 transition-colors ${
                                        done
                                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                            : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                    }`}>
                                        {done
                                            ? <CheckCircle2 className="h-3.5 w-3.5" />
                                            : <Play className="h-3 w-3 ml-0.5" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                                {tour.name}
                                            </p>
                                            {done && (
                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-full">
                                                    Done
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                                            {tour.description}
                                        </p>
                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                                            {tour.steps.length} step{tour.steps.length !== 1 ? "s" : ""}
                                            {done ? " · Click to replay" : ""}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {completedTours.size} of {TOURS.length} completed
                        </p>
                        {allCompleted && (
                            <button
                                type="button"
                                onClick={() => { resetTours(); setOpen(false); }}
                                className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
