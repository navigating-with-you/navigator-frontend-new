import { useState, useEffect, type ReactNode } from "react";
import {
    Brain,
    Layers,
    Search,
    Sparkles,
    Zap,
    BarChart2,
    RefreshCw,
    WrenchIcon,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThinkingStep } from "@/lib/api";

export const THINKING_STEP_LABELS: Record<string, string> = {
    understanding: "Understanding your question...",
    planning: "Planning my approach...",
    decomposing: "Breaking down the query...",
    searching: "Searching knowledge base...",
    evaluating: "Evaluating results...",
    reranking: "Ranking relevant sources...",
    refining: "Refining the answer...",
    synthesizing: "Synthesizing information...",
    answering: "Generating response...",
};

export function getStepIcon(step: string): ReactNode {
    switch (step) {
        case "understanding":  return <Brain      className="h-2 w-2 shrink-0 mt-0.5 text-violet-500" />;
        case "planning":       return <Layers     className="h-2 w-2 shrink-0 mt-0.5 text-blue-500"   />;
        case "decomposing":    return <RefreshCw  className="h-2 w-2 shrink-0 mt-0.5 text-amber-500"  />;
        case "searching":
        case "searching_kb":
        case "searching_web":  return <Search     className="h-2 w-2 shrink-0 mt-0.5 text-zinc-500"   />;
        case "evaluating":     return <BarChart2  className="h-2 w-2 shrink-0 mt-0.5 text-zinc-500"   />;
        case "reranking":      return <Sparkles   className="h-2 w-2 shrink-0 mt-0.5 text-emerald-500"/>;
        case "synthesizing":   return <Layers     className="h-2 w-2 shrink-0 mt-0.5 text-teal-500"   />;
        case "answering":      return <Zap        className="h-2 w-2 shrink-0 mt-0.5 text-amber-500"  />;
        case "tool_call":
        case "tool_result":    return <WrenchIcon className="h-2 w-2 shrink-0 mt-0.5 text-zinc-400"   />;
        default:               return <div className="h-1 w-1 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0 mt-1" />;
    }
}

export function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-[typingDot_1.4s_ease-in-out_0s_infinite]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-[typingDot_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-[typingDot_1.4s_ease-in-out_0.4s_infinite]" />
        </span>
    );
}

interface ThinkingAccordionProps {
    isStreaming: boolean;
    thinkingSteps: ThinkingStep[];
}

export function ThinkingAccordion({ isStreaming, thinkingSteps }: ThinkingAccordionProps) {
    const [isExpanded, setIsExpanded] = useState(isStreaming);

    useEffect(() => {
        if (isStreaming) {
            setIsExpanded(true);
        }
    }, [isStreaming]);

    if (!thinkingSteps || thinkingSteps.length === 0) return null;

    const lastStep = thinkingSteps[thinkingSteps.length - 1];

    const dotClass = isStreaming
        ? "bg-blue-500"
        : "bg-green-600 dark:bg-green-500";

    let headerText = "";
    if (isStreaming) {
        headerText = lastStep?.message || "Thinking...";
    } else {
        const hasSearch = thinkingSteps.some(s =>
            s.step === "searching" ||
            (s.message || "").toLowerCase().includes("search") ||
            (s.message || "").toLowerCase().includes("brows")
        );
        if (hasSearch) {
            headerText = "Finished browsing the web and documents";
        } else if (lastStep?.message && lastStep.message.startsWith("Drafting")) {
            headerText = lastStep.message.replace("Drafting", "Drafted");
        } else {
            headerText = lastStep?.message || "Completed thinking steps";
        }
    }

    return (
        <div className="w-full max-w-[90%] sm:max-w-[75%] md:max-w-[50%] mb-1.5 select-none bg-surface-sidebar dark:bg-surface-sidebar rounded-lg transition-all overflow-hidden">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between cursor-pointer px-2.5 py-1.5 hover:bg-[#E7E7E0]/50 dark:hover:bg-[#E7E7E0]/20 transition-colors"
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-1">
                    <span className={cn("h-1 w-1 rounded-full shrink-0", dotClass)} />
                    <span className={cn(
                        "text-[10px] font-medium",
                        isStreaming
                            ? "text-zinc-600 dark:text-zinc-400"
                            : "text-green-700 dark:text-green-400 font-semibold"
                    )}>
                        {headerText}
                    </span>
                </div>
                <ChevronDown className={cn("h-3 w-3 text-zinc-500 dark:text-zinc-400 transition-transform ml-1.5", isExpanded ? "" : "-rotate-90")} />
            </button>

            {isExpanded && (
                <>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
                    <div className="space-y-0.5 text-[9px] text-zinc-600 dark:text-zinc-400 px-2.5 py-1.5 max-h-32 overflow-y-auto">
                        {thinkingSteps.map((step, idx) => {
                            const stepMs = idx < thinkingSteps.length - 1
                                ? Math.round(
                                    new Date(thinkingSteps[idx + 1].timestamp).getTime() -
                                    new Date(step.timestamp).getTime()
                                  )
                                : null;

                            return (
                                <div key={idx} className="flex items-center gap-1">
                                    {getStepIcon(step.step)}
                                    <span className="leading-tight flex-1">{step.message}</span>
                                    {stepMs !== null && stepMs > 200 && (
                                        <span className="text-[8px] text-zinc-400 ml-auto shrink-0 tabular-nums">{stepMs}ms</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
