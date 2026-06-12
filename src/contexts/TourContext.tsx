import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
    type JSX,
} from "react";
import { TOURS, TOUR_STORAGE_KEY, TOUR_PROGRESS_KEY, type Tour, type TourStep } from "@/tours/tours";

/** A tour with its steps already filtered for the current user's permissions */
interface ActiveTour extends Tour {
    steps: TourStep[];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TourContextValue {
    activeTour: Tour | null;
    stepIndex: number;
    currentStep: TourStep | null;
    totalSteps: number;
    completedTours: Set<string>;
    /** Pass filteredSteps to override the tour's full step list (for RBAC filtering). */
    startTour: (tourId: string, filteredSteps?: TourStep[]) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTour: () => void;
    resetTours: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const TourContext = createContext<TourContextValue | null>(null);

// ── Storage helpers ───────────────────────────────────────────────────────────

function loadCompleted(): Set<string> {
    try {
        return new Set<string>(JSON.parse(localStorage.getItem(TOUR_STORAGE_KEY) ?? "[]"));
    } catch {
        return new Set<string>();
    }
}

function saveCompleted(set: Set<string>): void {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify([...set]));
}

function loadProgress(): { tourId: string; stepIndex: number } | null {
    try {
        const raw = localStorage.getItem(TOUR_PROGRESS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function TourProvider({ children }: { children: ReactNode }): JSX.Element {
    // Restore active tour + step from localStorage on mount
    const [activeTour, setActiveTour] = useState<ActiveTour | null>(() => {
        const saved = loadProgress();
        return saved ? (TOURS.find((t) => t.id === saved.tourId) ?? null) : null;
    });
    const [stepIndex, setStepIndex] = useState<number>(() => {
        return loadProgress()?.stepIndex ?? 0;
    });
    const [completedTours, setCompletedTours] = useState<Set<string>>(loadCompleted);

    // Persist active tour progress whenever it changes
    useEffect(() => {
        if (activeTour) {
            localStorage.setItem(
                TOUR_PROGRESS_KEY,
                JSON.stringify({ tourId: activeTour.id, stepIndex }),
            );
        } else {
            localStorage.removeItem(TOUR_PROGRESS_KEY);
        }
    }, [activeTour, stepIndex]);

    const markCompleted = useCallback((tourId: string) => {
        setCompletedTours((prev) => {
            const next = new Set(prev);
            next.add(tourId);
            saveCompleted(next);
            return next;
        });
    }, []);

    const startTour = useCallback((tourId: string, filteredSteps?: TourStep[]) => {
        const tour = TOURS.find((t) => t.id === tourId);
        if (!tour) return;
        const steps = filteredSteps ?? tour.steps;
        if (steps.length === 0) return;
        setActiveTour({ ...tour, steps });
        setStepIndex(0);
    }, []);

    const nextStep = useCallback(() => {
        setStepIndex((prev) => {
            if (!activeTour) return prev;
            const isLast = prev >= activeTour.steps.length - 1;
            if (isLast) {
                markCompleted(activeTour.id);
                setActiveTour(null);
                return 0;
            }
            return prev + 1;
        });
    }, [activeTour, markCompleted]);

    const prevStep = useCallback(() => {
        setStepIndex((prev) => Math.max(0, prev - 1));
    }, []);

    const skipTour = useCallback(() => {
        if (activeTour) markCompleted(activeTour.id);
        setActiveTour(null);
        setStepIndex(0);
    }, [activeTour, markCompleted]);

    const resetTours = useCallback(() => {
        localStorage.removeItem(TOUR_STORAGE_KEY);
        localStorage.removeItem(TOUR_PROGRESS_KEY);
        setCompletedTours(new Set());
        setActiveTour(null);
        setStepIndex(0);
    }, []);

    const currentStep = activeTour ? (activeTour.steps[stepIndex] ?? null) : null;

    return (
        <TourContext.Provider
            value={{
                activeTour,
                stepIndex,
                currentStep,
                totalSteps: activeTour?.steps.length ?? 0,
                completedTours,
                startTour,
                nextStep,
                prevStep,
                skipTour,
                resetTours,
            }}
        >
            {children}
        </TourContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTour(): TourContextValue {
    const ctx = useContext(TourContext);
    if (!ctx) throw new Error("useTour must be used within <TourProvider>");
    return ctx;
}
