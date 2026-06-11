import { useState, useRef, useEffect, type JSX } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type CurrencyConfig = {
    code: string;
    symbol: string;
    flag: string;
    label: string;
    multiplier: number;
};

const currencies: CurrencyConfig[] = [
    { code: "USD", symbol: "$", flag: "🇺🇸", label: "USD", multiplier: 1.0 },
    { code: "EUR", symbol: "€", flag: "🇪🇺", label: "EUR", multiplier: 0.92 },
    { code: "GBP", symbol: "£", flag: "🇬🇧", label: "GBP", multiplier: 0.79 },
    { code: "AUD", symbol: "A$", flag: "🇦🇺", label: "AUD", multiplier: 1.5 },
    { code: "INR", symbol: "₹", flag: "🇮🇳", label: "INR", multiplier: 83.0 },
];

type PlanPriceInfo = {
    name: string;
    monthlyBase: number;
    yearlyBase: number;
    hasSaveBadge: boolean;
    buttonVariant: "downgrade" | "current" | "upgrade";
    recommended?: boolean;
    features: string[];
};

const plans: PlanPriceInfo[] = [
    {
        name: "Core",
        monthlyBase: 59,
        yearlyBase: 708,
        hasSaveBadge: false,
        buttonVariant: "downgrade",
        features: [
            "Max 500 pages of documents",
            "Max 350 simple interactions a month",
            "Max 100 complex interactions a month",
            "Only simple web search + email and teams/slack integrations",
            "Standard Support",
            "$0.05 per simple overage interaction",
            "$0.15 per complex overage interaction",
            "$0.5 per overage page",
        ],
    },
    {
        name: "Started",
        monthlyBase: 99,
        yearlyBase: 1045, // originally 1188
        hasSaveBadge: true,
        buttonVariant: "current",
        features: [
            "1,000+ document pages",
            "700+ simple interactions / month",
            "250+ complex interactions / month",
            "Full access to adaptive agents & integrations with Email, Teams, and Slack",
            "Standard customer support",
            "$0.035 per additional simple interaction",
            "$0.10 per additional complex interaction",
            "$0.35 per additional document page",
        ],
    },
    {
        name: "Pro",
        monthlyBase: 199,
        yearlyBase: 2101, // originally 2388
        hasSaveBadge: true,
        buttonVariant: "upgrade",
        recommended: true,
        features: [
            "5,000+ document pages",
            "2,100+ simple interactions / month",
            "900+ complex interactions / month",
            "Adaptive agents & integrations with Email, Teams, and Slack",
            "Priority customer support",
            "$0.03 per additional simple interaction",
            "$0.08 per additional complex interaction",
            "$0.30 per additional document page",
        ],
    },
    {
        name: "Scale",
        monthlyBase: 599,
        yearlyBase: 6325, // originally 7188
        hasSaveBadge: true,
        buttonVariant: "upgrade",
        features: [
            "20,000+ document pages",
            "7,000+ simple interactions / month",
            "4,000+ complex interactions / month",
            "Adaptive agents & integrations with Email, Teams, Slack, Intercom, Asana",
            "Priority customer support",
            "$0.02 per additional simple interaction",
            "$0.06 per additional complex interaction",
            "$0.20 per additional document page",
        ],
    },
];

export default function SubscriptionPage(): JSX.Element {
    const [currency, setCurrency] = useState<CurrencyConfig>(currencies[0]);
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Load preferences from localStorage on mount
    useEffect(() => {
        const savedCurrencyCode = localStorage.getItem("subscription-currency");
        const savedBillingCycle = localStorage.getItem("subscription-billing-cycle") as "monthly" | "yearly" | null;

        if (savedCurrencyCode) {
            const saved = currencies.find(c => c.code === savedCurrencyCode);
            if (saved) setCurrency(saved);
        }

        if (savedBillingCycle && ["monthly", "yearly"].includes(savedBillingCycle)) {
            setBillingCycle(savedBillingCycle);
        }
    }, []);

    // Save preferences to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("subscription-currency", currency.code);
    }, [currency]);

    useEffect(() => {
        localStorage.setItem("subscription-billing-cycle", billingCycle);
    }, [billingCycle]);

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 359; // card width (335) + gap (24)
            scrollContainerRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth"
            });
        }
    };

    const handlePlanAction = (planName: string, variant: string) => {
        if (variant === "current") {
            toast.info("You are already on the Started plan.");
        } else if (variant === "downgrade") {
            toast.warning(`Downgrading to ${planName} is only available at the end of the billing period.`);
        } else {
            toast.success(`Redirecting to upgrade checkout for ${planName} plan...`);
        }
    };

    return (
        <div className="flex flex-col min-h-full w-full max-w-7xl mx-auto p-3 sm:p-6 md:p-8 space-y-5 bg-transparent shrink-0">
            {/* Header Title Row */}
            <div className="flex flex-row items-center w-full shrink-0">
                <h1 className="text-[22px] font-medium text-zinc-900 dark:text-zinc-100">Subscription</h1>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between w-full shrink-0">
                <div className="flex items-center gap-3">
                    {/* Currency selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex items-center gap-3 px-4 py-2 border border-[#E7E7E0] dark:border-zinc-800 rounded-[10px] text-sm font-medium text-zinc-800 dark:text-zinc-200 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer select-none transition-colors h-10"
                            >
                                <span className="text-base">{currency.flag}</span>
                                <span>{currency.label}</span>
                                <ChevronDown className="h-4 w-4 text-zinc-450 dark:text-zinc-500" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-32 bg-[#FEFFFA] dark:bg-zinc-900 border border-[#E7E7E0] dark:border-zinc-800 rounded-xl p-1 shadow-md">
                            {currencies.map((curr) => (
                                <DropdownMenuItem
                                    key={curr.code}
                                    onClick={() => setCurrency(curr)}
                                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                >
                                    <span>{curr.flag}</span>
                                    <span>{curr.label}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Billing Cycle Toggle */}
                    <div className="flex items-center p-1 bg-[#FEFFFA] dark:bg-zinc-900 border border-[#E7E7E0] dark:border-zinc-800 rounded-[10px] h-10 select-none gap-1">
                        <button
                            type="button"
                            onClick={() => setBillingCycle("monthly")}
                            className={`flex items-center h-full px-4 rounded-[6px] text-xs font-semibold cursor-pointer transition-all ${billingCycle === "monthly"
                                ? "bg-[#EBF2FE] dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                                : "text-zinc-500 hover:text-zinc-855 dark:text-zinc-450 dark:hover:text-zinc-255"
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingCycle("yearly")}
                            className={`flex items-center gap-2 h-full px-3 rounded-[6px] text-xs font-semibold cursor-pointer transition-all ${billingCycle === "yearly"
                                ? "bg-[#EBF2FE] dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold"
                                : "text-zinc-500 hover:text-zinc-855 dark:text-zinc-450 dark:hover:text-zinc-255"
                                }`}
                        >
                            <span>Yearly</span>
                            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-bold transition-all ${billingCycle === "yearly"
                                ? "bg-[#FFEBE3] text-[#FF4E20] dark:bg-orange-950/50 dark:text-orange-400"
                                : "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-500"
                                }`}>
                                <Tag className="h-3.5 w-3.5 fill-current stroke-[2.5]" />
                                Up to 12% Off
                            </span>
                        </button>
                    </div>
                </div>

                {/* History Navigation Buttons */}
                <div className="hidden md:flex items-center gap-1.5">
                    <button
                        onClick={() => scroll("left")}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7E7E0] dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        aria-label="Scroll Left"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => scroll("right")}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7E7E0] dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                        aria-label="Scroll Right"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Plans Horizontal Scroll Layout (Scrollbar Hidden) */}
            <div
                ref={scrollContainerRef}
                className="flex-1 flex flex-col md:flex-row gap-6 pt-2 max-w-full items-center md:items-start md:overflow-x-auto pb-6 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
                {plans.map((plan) => {
                    const price = "XX";
                    const originalYearly = "XX";
                    const showDiscount = "XX";

                    return (
                        <div
                            key={plan.name}
                            className="relative flex flex-col rounded-[16px] border border-[#E7E7E0] dark:border-zinc-800 bg-[#FEFFFA] dark:bg-zinc-900/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] w-full max-w-[340px] md:w-[335px] shrink-0 gap-4"
                        >
                            {/* Recommendation Badge */}
                            {plan.recommended && (
                                <span className="absolute top-4 right-4 bg-[#EBF2FE] dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-100/30 dark:border-blue-900/30 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-xs select-none">
                                    Recommended
                                </span>
                            )}

                            {/* Plan Title */}
                            <div>
                                <h3 className="text-[19px] font-semibold text-zinc-900 dark:text-zinc-100">{plan.name}</h3>
                            </div>

                            {/* Pricing Section */}
                            <div className="flex items-baseline justify-between w-full flex-wrap gap-1">
                                <div className="flex items-baseline gap-1.5">
                                    {showDiscount && (
                                        <span className="text-zinc-400 dark:text-zinc-550 text-[15px] line-through font-medium">
                                            {currency.symbol}{(originalYearly)}
                                        </span>
                                    )}
                                    <span className="text-[31px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none">
                                        {currency.symbol}{(price)}
                                    </span>
                                    <span className="text-zinc-400 dark:text-zinc-450 text-xs font-normal">
                                        /{billingCycle === "monthly" ? "month" : "year"}
                                    </span>
                                </div>

                                {/* Save 12% Badge */}
                                {showDiscount && (
                                    <span className="bg-[#FFEBE3] dark:bg-orange-950/40 text-[#FF4E20] dark:text-orange-400 border border-orange-100/20 dark:border-orange-900/20 rounded-[4px] px-2 py-0.5 text-[10px] font-bold uppercase select-none">
                                        Save 12%
                                    </span>
                                )}
                            </div>

                            {/* Action Button */}
                            <div>
                                {plan.buttonVariant === "current" ? (
                                    <Button
                                        disabled
                                        className="w-full flex items-center justify-center gap-2 bg-[#FEFFFA] dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-[8px] font-medium py-2 h-10 border border-[#E7E7E0] dark:border-zinc-800 select-none cursor-default"
                                    >
                                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-400 dark:bg-zinc-650 text-white p-0.5">
                                            <Check className="h-3 w-3 shrink-0" />
                                        </div>
                                        Current Plan
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={() => handlePlanAction(plan.name, plan.buttonVariant)}
                                        className="w-full rounded-[8px] font-medium py-2 h-10 border border-[#E7E7E0] dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-[#FEFFFA] dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        {plan.buttonVariant === "upgrade" ? "Upgrade" : "Downgrade"}
                                    </Button>
                                )}
                            </div>

                            {/* Features Checklist */}
                            <ul className="space-y-2.5 text-[13px] text-zinc-550 dark:text-zinc-400 font-normal pt-2">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                                        <Check className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
