import { useMemo, useState } from "react";
import { RotateCw, Search, ToyBrick as Plug, X } from "lucide-react";
import IntegrationCard from "@/components/integration/IntegrationCard";
import UnifiedEmptyState from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

const SlackIcon = () => (
    <img src="/Slack.svg" alt="Slack" className="h-7 w-7 object-contain" />
);

const TeamsIcon = () => (
    <img src="/Teams.svg" alt="Microsoft Teams" className="h-7 w-7 object-contain" />
);

const EmptyPlugIcon = ({ className }: { className?: string }) => (
    <Plug className={className} />
);

type Variant = "populated" | "empty";

type IntegrationItem = {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    defaultEnabled?: boolean;
};

type IntegrationProps = {
    variant?: Variant;
};

const Integration: React.FC<IntegrationProps> = ({ variant = "populated" }) => {
    const [query, setQuery] = useState<string>("");

    const allIntegrations: IntegrationItem[] = useMemo(
        () => [
            {
                id: "slack",
                name: "Slack",
                description:
                    "Streamline team collaboration with timelines and customizable workflows.",
                icon: <SlackIcon />,
                defaultEnabled: false,
            },
            {
                id: "teams",
                name: "Teams",
                description:
                    "Enhance collaboration and access important updates directly within Microsoft Teams.",
                icon: <TeamsIcon />,
                defaultEnabled: true,
            },
        ],
        []
    );

    const isEmpty: boolean = variant === "empty";

    const filtered: IntegrationItem[] = useMemo(() => {
        if (isEmpty) return [];

        const q = query.trim().toLowerCase();

        if (!q) return allIntegrations;

        return allIntegrations.filter(
            (i) =>
                i.name.toLowerCase().includes(q) ||
                i.description.toLowerCase().includes(q)
        );
    }, [query, allIntegrations, isEmpty]);

    return (

        <section
            data-testid="integration-screen"
            data-tour="integration-page"
            className="p-3 sm:p-6 md:p-8 flex flex-col h-full w-full bg-transparent dark:bg-zinc-950 overflow-hidden"
        >
            {/* Title row */}
            <div className="flex flex-col gap-1 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1
                        data-testid="integration-title"
                        className="text-[26px] font-semibold tracking-tight text-neutral-900 dark:text-zinc-100"
                    >
                        Integration
                    </h1>

                    <button
                        type="button"
                        data-testid="integration-refresh-btn"
                        className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-zinc-300 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:bg-neutral-50 dark:hover:bg-zinc-700 hover:text-neutral-900 dark:hover:text-zinc-100 focus:outline-none"
                    >
                        <RotateCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Connect your existing work tools and external apps to sync data.
                </p>
            </div>

            {/* Search */}
            <div className="relative mt-5 shrink-0">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                <Input
                    value={query}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setQuery(e.target.value)
                    }
                    placeholder="Search integrations by name or description..."
                    data-testid="integration-search-input"
                    disabled={isEmpty}
                    className="h-10 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pl-11 pr-10 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-blue-500/20"
                />
                {query && !isEmpty && (
                    <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        aria-label="Clear search"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Body */}
            <div className="mt-4 flex-1 min-h-0 overflow-y-auto hover-scrollbar pb-2">
                {isEmpty || filtered.length === 0 ? (
                    <UnifiedEmptyState
                        title={isEmpty ? "No Data Found" : `No results found for "${query}"`}
                        description={isEmpty ? "No integrations have been added yet." : "Try adjusting your search terms."}
                        icon={<EmptyPlugIcon className="h-8 w-8 text-neutral-600" />}
                        testId="integration-empty-state"
                    />
                ) : (
                    <div
                        data-testid="integration-grid"
                        className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 sm:gap-6 w-full"
                    >
                        {filtered.map((integration) => (
                            <IntegrationCard
                                key={integration.id}
                                integration={integration}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Integration;