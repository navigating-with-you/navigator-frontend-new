import React, { useState } from "react";
import { Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type Integration = {
    id: string | number;
    name: string;
    description: string;
    icon: React.ReactNode;
    defaultEnabled?: boolean;
};

type IntegrationCardProps = {
    integration: Integration;
};

const IntegrationCard: React.FC<IntegrationCardProps> = ({ integration }) => {
    const { id, name, description, icon, defaultEnabled = false } = integration;
    const [enabled, setEnabled] = useState<boolean>(defaultEnabled);

    return (
        <div
            data-testid={`integration-card-${id}`}
            className="group relative flex flex-col rounded-xl border border-neutral-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/60 p-4 sm:p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)] dark:hover:border-zinc-600"
        >
            {/* Top row: icon */}
            <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-50 dark:bg-zinc-700/50">
                    {icon}
                </div>
            </div>

            {/* Title + description */}
            <div className="mt-5">
                <h3
                    data-testid={`integration-name-${id}`}
                    className="text-base font-semibold tracking-tight text-neutral-900 dark:text-zinc-100"
                >
                    {name}
                </h3>
                <p
                    data-testid={`integration-description-${id}`}
                    className="mt-1.5 text-sm leading-relaxed text-neutral-500 dark:text-zinc-400"
                >
                    {description}
                </p>
            </div>

            {/* Divider */}
            <div className="mt-6 border-t border-neutral-100 dark:border-zinc-700/60" />

            {/* Footer: settings + status + toggle */}
            <div className="mt-4 flex items-center justify-between w-full gap-2">
                <button
                    type="button"
                    aria-label={`Settings for ${name}`}
                    data-testid={`integration-settings-${id}`}
                    className="rounded-md p-1.5 text-neutral-400 dark:text-zinc-500 transition-colors hover:bg-neutral-100 dark:hover:bg-zinc-700 hover:text-neutral-700 dark:hover:text-zinc-300 focus:outline-none shrink-0"
                >
                    <Settings className="h-[18px] w-[18px]" />
                </button>

                <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                    <span
                        data-testid={`integration-status-label-${id}`}
                        className={`text-xs sm:text-sm font-medium transition-colors ${enabled ? "text-neutral-900 dark:text-zinc-100" : "text-neutral-400 dark:text-zinc-500"}`}
                    >
                        {enabled ? "Connected" : "Disconnected"}
                    </span>

                    <Switch
                        checked={enabled}
                        onCheckedChange={setEnabled}
                        data-testid={`integration-toggle-${id}`}
                        className="data-[state=checked]:bg-blue-600 scale-90 sm:scale-100"
                    />
                </div>
            </div>
        </div>
    );
};

export default IntegrationCard;