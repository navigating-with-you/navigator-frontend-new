import { useNavigate } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JSX, ReactNode } from "react";

interface LegalPageLayoutProps {
    icon: LucideIcon;
    title: string;
    footerLink: { label: string; href: string };
    children: ReactNode;
}

export default function LegalPageLayout({
    icon: Icon,
    title,
    footerLink,
    children,
}: LegalPageLayoutProps): JSX.Element {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            <header className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm px-6 py-4">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold">{title}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-12">
                {children}
            </main>

            <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-5 mt-12">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        © {new Date().getFullYear()} Navigator. All rights reserved.
                    </p>
                    <a
                        href={footerLink.href}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {footerLink.label}
                    </a>
                </div>
            </footer>
        </div>
    );
}
