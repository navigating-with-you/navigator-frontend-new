import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Users, Zap } from "lucide-react";

const features = [
    {
        icon: BookOpen,
        title: "Centralised knowledge",
        description: "Upload documents, PDFs, and web sources. Your team's entire knowledge base, searchable in seconds.",
    },
    {
        icon: Users,
        title: "Team-aware access",
        description: "Role-based permissions ensure every team member sees exactly what they need — nothing more.",
    },
    {
        icon: Zap,
        title: "AI that knows your context",
        description: "Ask questions in plain English. Get answers grounded in your actual documents, with source citations.",
    },
];

export default function LandingPage() {
    const { login, register, isLoading } = useKindeAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[hsl(var(--background))]">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[hsl(var(--primary))]" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
            {/* ── Header ─────────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-[hsl(var(--border))]">
                <img
                    src="/navigator-logo.svg"
                    alt="Navigator"
                    className="h-7 w-auto object-contain dark:brightness-110"
                />
                <Button
                    variant="ghost"
                    onClick={() => login()}
                    className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                    Sign in
                </Button>
            </header>

            {/* ── Hero ───────────────────────────────────────────────── */}
            <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:py-24 text-center">
                <div className="max-w-2xl space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-xs font-medium text-[hsl(var(--muted-foreground))]">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Knowledge management for modern teams
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-tight">
                        Your team's knowledge,<br className="hidden sm:block" /> instantly accessible
                    </h1>

                    <p className="text-base sm:text-lg text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xl mx-auto">
                        Navigator connects your documents, policies, and processes so your team can find answers — not dig through folders.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Button
                            onClick={() => register()}
                            className="h-11 px-6 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm flex items-center gap-2"
                        >
                            Get started free
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => login()}
                            className="h-11 px-6 rounded-lg font-medium border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
                        >
                            Sign in to existing account
                        </Button>
                    </div>
                </div>

                {/* ── Feature highlights ────────────────────────────── */}
                <div className="mt-20 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full text-left">
                    {features.map((f) => {
                        const Icon = f.icon;
                        return (
                            <div
                                key={f.title}
                                className="flex flex-col gap-3 p-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                            >
                                <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                                    <Icon className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{f.title}</p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{f.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* ── Footer ─────────────────────────────────────────────── */}
            <footer className="px-6 sm:px-10 py-5 border-t border-[hsl(var(--border))]">
                <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
                    © {new Date().getFullYear()} Navigator. All rights reserved.
                </p>
            </footer>
        </div>
    );
}
