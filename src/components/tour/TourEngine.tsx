import {
    useEffect,
    useState,
    useRef,
    useCallback,
    type JSX,
    type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTour } from "@/contexts/TourContext";
import { usePermissions } from "@/hooks/usePermissions";
import type { TourPlacement, TourStep } from "@/tours/tours";

// ── Constants ─────────────────────────────────────────────────────────────────

const POPOVER_WIDTH = 336;
const POPOVER_HEIGHT_EST = 210;
const GAP = 14;
const SCREEN_MARGIN = 16;
const DEFAULT_PADDING = 8;
const SCROLL_SETTLE_MS = 280;
const POLL_INTERVAL_MS = 120;
/** Attempts before auto-skipping a missing element (no navigateTo) */
const QUICK_SKIP_ATTEMPTS = 4; // ~480 ms
/** Attempts before showing fallback card for navigation steps */
const NAVIGATION_POLL_ATTEMPTS = 25; // ~3 s

const OVERLAY_BG = "rgba(0,0,0,0.52)";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Spotlight {
    top: number;
    left: number;
    width: number;
    height: number;
    ww: number;
    wh: number;
}

interface PopoverPos {
    top: number;
    left: number;
    placement: TourPlacement;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the VISIBLE element matching the data-tour attribute.
 * When the same target exists in both collapsed and expanded sidebars,
 * `querySelector` would return the first (potentially hidden) one.
 * We scan all matches and pick the first with a non-zero bounding rect.
 */
function findVisibleTourTarget(target: string): HTMLElement | null {
    const all = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
    for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
    }
    return null;
}

// ── Geometry ──────────────────────────────────────────────────────────────────

function measureEl(el: Element, padding: number): Spotlight {
    const r = el.getBoundingClientRect();
    return {
        top: Math.round(r.top - padding),
        left: Math.round(r.left - padding),
        width: Math.round(r.width + padding * 2),
        height: Math.round(r.height + padding * 2),
        ww: window.innerWidth,
        wh: window.innerHeight,
    };
}

function placePopover(s: Spotlight, hint: TourPlacement = "auto"): PopoverPos {
    const { ww, wh } = s;
    const spaceBelow = wh - s.top - s.height;
    const spaceAbove = s.top;
    const spaceRight = ww - s.left - s.width;

    let placement: TourPlacement = hint;
    if (hint === "auto") {
        if (spaceBelow >= POPOVER_HEIGHT_EST + GAP) placement = "bottom";
        else if (spaceAbove >= POPOVER_HEIGHT_EST + GAP) placement = "top";
        else if (spaceRight >= POPOVER_WIDTH + GAP) placement = "right";
        else placement = "left";
    }

    const cx = s.left + s.width / 2;
    const cy = s.top + s.height / 2;
    const clampX = (v: number) => Math.max(SCREEN_MARGIN, Math.min(v, ww - POPOVER_WIDTH - SCREEN_MARGIN));
    const clampY = (v: number) => Math.max(SCREEN_MARGIN, Math.min(v, wh - POPOVER_HEIGHT_EST - SCREEN_MARGIN));

    switch (placement) {
        case "bottom":
            return { top: s.top + s.height + GAP, left: clampX(cx - POPOVER_WIDTH / 2), placement };
        case "top":
            return { top: clampY(s.top - GAP - POPOVER_HEIGHT_EST), left: clampX(cx - POPOVER_WIDTH / 2), placement };
        case "right":
            return { top: clampY(cy - POPOVER_HEIGHT_EST / 2), left: s.left + s.width + GAP, placement };
        case "left":
        default:
            return { top: clampY(cy - POPOVER_HEIGHT_EST / 2), left: clampX(s.left - GAP - POPOVER_WIDTH), placement };
    }
}

// ── Overlay — 4 solid rects leaving a clean transparent hole ─────────────────

function TourOverlay({ s }: { s: Spotlight }): JSX.Element {
    const { top, left, width, height, ww, wh } = s;
    const base: CSSProperties = {
        position: "fixed",
        background: OVERLAY_BG,
        zIndex: 9990,
        pointerEvents: "all",
        transition: "top 240ms ease, left 240ms ease, width 240ms ease, height 240ms ease",
    };
    return (
        <>
            <div style={{ ...base, top: 0, left: 0, width: ww, height: Math.max(0, top) }} />
            <div style={{ ...base, top: top + height, left: 0, width: ww, height: Math.max(0, wh - top - height) }} />
            <div style={{ ...base, top, left: 0, width: Math.max(0, left), height }} />
            <div style={{ ...base, top, left: left + width, width: Math.max(0, ww - left - width), height }} />
        </>
    );
}

// ── Popover ───────────────────────────────────────────────────────────────────

interface PopoverProps {
    pos: PopoverPos;
    title: string;
    content: string;
    stepIndex: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
}

function TourPopover({ pos, title, content, stepIndex, totalSteps, onNext, onPrev, onSkip }: PopoverProps): JSX.Element {
    const isFirst = stepIndex === 0;
    const isLast = stepIndex === totalSteps - 1;
    const progress = ((stepIndex + 1) / totalSteps) * 100;

    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-label={`Tour: ${title}`}
            style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: POPOVER_WIDTH,
                zIndex: 9995,
                transition: "top 240ms ease, left 240ms ease",
            }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl select-none overflow-hidden"
        >
            {/* Thin progress bar */}
            <div className="h-0.5 bg-zinc-100 dark:bg-zinc-800 w-full">
                <div
                    className="h-full bg-zinc-400 dark:bg-zinc-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug flex-1 min-w-0">
                    {title}
                </h3>
                <button
                    type="button"
                    onClick={onSkip}
                    aria-label="Close tour"
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors -mt-0.5 -mr-1 shrink-0"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Content */}
            <p className="px-4 pb-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {content}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                    {stepIndex + 1} / {totalSteps}
                </span>
                <div className="flex items-center gap-2">
                    {isFirst ? (
                        <button
                            type="button"
                            onClick={onSkip}
                            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors px-2.5 py-1.5"
                        >
                            Skip
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onPrev}
                            className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                        >
                            <ChevronLeft className="h-3 w-3" />
                            Back
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onNext}
                        className="flex items-center gap-0.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-3.5 py-1.5 rounded-lg transition-colors"
                    >
                        {isLast ? "Done" : "Next"}
                        {!isLast && <ChevronRight className="h-3 w-3" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Centered fallback when target is truly unreachable on the last step ────────

function FloatingCard(props: Omit<PopoverProps, "pos">): JSX.Element {
    const pos: PopoverPos = {
        top: Math.max(SCREEN_MARGIN, (window.innerHeight - POPOVER_HEIGHT_EST) / 2),
        left: Math.max(SCREEN_MARGIN, (window.innerWidth - POPOVER_WIDTH) / 2),
        placement: "bottom",
    };
    return (
        <>
            <div style={{ position: "fixed", inset: 0, background: OVERLAY_BG, zIndex: 9990 }} />
            <TourPopover pos={pos} {...props} />
        </>
    );
}

// ── Engine ────────────────────────────────────────────────────────────────────

export function TourEngine(): JSX.Element | null {
    const { activeTour, currentStep, stepIndex, totalSteps, nextStep, prevStep, skipTour } = useTour();
    const { isLoading: isPermissionsLoading } = usePermissions();
    const navigate = useNavigate();

    const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
    const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
    const [targetMissing, setTargetMissing] = useState(false);
    const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Keep nextStep stable inside poll closure
    const nextStepRef = useRef(nextStep);
    useEffect(() => { nextStepRef.current = nextStep; }, [nextStep]);

    const clearTimers = useCallback(() => {
        if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
        if (scrollRef.current) { clearTimeout(scrollRef.current); scrollRef.current = null; }
    }, []);

    const resolveStep = useCallback((step: TourStep) => {
        clearTimers();
        setTargetMissing(false); // reset before each new poll

        if (step.navigateTo) {
            navigate(step.navigateTo);
        }

        const maxAttempts = step.navigateTo ? NAVIGATION_POLL_ATTEMPTS : QUICK_SKIP_ATTEMPTS;
        let attempts = 0;
        const isLast = stepIndex >= totalSteps - 1;

        const poll = () => {
            const el = findVisibleTourTarget(step.target);
            if (el) {
                const rect = el.getBoundingClientRect();
                const inView =
                    rect.top >= 0 && rect.bottom <= window.innerHeight &&
                    rect.left >= 0 && rect.right <= window.innerWidth;
                if (!inView) {
                    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
                }
                scrollRef.current = setTimeout(() => {
                    const padding = step.spotlightPadding ?? DEFAULT_PADDING;
                    const s = measureEl(el, padding);
                    setSpotlight(s);
                    setPopoverPos(placePopover(s, step.placement ?? "auto"));
                    setTargetMissing(false);
                }, inView ? 0 : SCROLL_SETTLE_MS);
            } else if (attempts++ < maxAttempts) {
                pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
            } else if (!isLast) {
                // Element is missing (RBAC-gated or wrong page) — auto-advance
                nextStepRef.current();
            } else {
                // Last step, element truly missing — show floating fallback
                setTargetMissing(true);
                setSpotlight(null);
                setPopoverPos(null);
            }
        };

        // Give React a moment to render after navigation or initial mount
        pollRef.current = setTimeout(poll, step.navigateTo ? 300 : 40);
    }, [clearTimers, navigate, stepIndex, totalSteps]);

    useEffect(() => {
        if (!currentStep) {
            clearTimers();
            setSpotlight(null);
            setPopoverPos(null);
            return;
        }
        // Wait until roles are fetched — sidebar items are hidden until permissions load,
        // so resolving too early would find no elements and auto-skip RBAC-gated steps.
        if (isPermissionsLoading) return;
        resolveStep(currentStep);
        return clearTimers;
    }, [currentStep, isPermissionsLoading, resolveStep, clearTimers]);

    // Re-measure on resize
    useEffect(() => {
        if (!activeTour) return;
        const onResize = () => {
            if (currentStep) resolveStep(currentStep);
        };
        window.addEventListener("resize", onResize, { passive: true });
        return () => window.removeEventListener("resize", onResize);
    }, [activeTour, currentStep, resolveStep]);

    // Keyboard navigation
    useEffect(() => {
        if (!activeTour) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.stopPropagation(); skipTour(); }
            else if (e.key === "ArrowRight") nextStep();
            else if (e.key === "ArrowLeft") prevStep();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [activeTour, nextStep, prevStep, skipTour]);

    if (!activeTour || !currentStep) return null;

    const popoverProps = {
        title: currentStep.title,
        content: currentStep.content,
        stepIndex,
        totalSteps,
        onNext: nextStep,
        onPrev: prevStep,
        onSkip: skipTour,
    };

    if (targetMissing || !spotlight || !popoverPos) {
        return createPortal(<FloatingCard {...popoverProps} />, document.body);
    }

    return createPortal(
        <>
            <TourOverlay s={spotlight} />
            <TourPopover pos={popoverPos} {...popoverProps} />
        </>,
        document.body,
    );
}
