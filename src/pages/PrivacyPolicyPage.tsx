import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
            <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
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
                        <Shield className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-semibold">Privacy Policy</span>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-12">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                            Effective date: To be announced
                        </p>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 px-5 py-4">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-1">
                            Document in preparation
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-500 leading-relaxed">
                            Our Privacy Policy is currently being prepared by our legal team and will be published
                            prior to the public launch of Navigator. It will cover how we collect, use, store,
                            and protect your personal data in compliance with the California Consumer Privacy Act (CCPA),
                            applicable US federal law, and other privacy regulations.
                        </p>
                    </div>

                    <div className="space-y-8 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                What this policy will cover
                            </h2>
                            <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                                <li>What personal information we collect and why</li>
                                <li>How we use and process your data</li>
                                <li>Data retention periods</li>
                                <li>Third-party services and data processors</li>
                                <li>Your rights under CCPA and applicable US law</li>
                                <li>How to exercise your right to access, correct, or delete your data</li>
                                <li>How we protect your data with security measures</li>
                                <li>How to contact us with privacy questions or complaints</li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Your data rights (CCPA)
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                California residents have rights under the California Consumer Privacy Act (CCPA),
                                including the right to know what personal data we hold, the right to request deletion,
                                and the right to opt out of the sale of personal information.
                                You can already exercise these rights from your Profile page.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Contact
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                For privacy inquiries, please contact our team at{" "}
                                <a
                                    href="mailto:privacy@navigator.ai"
                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                >
                                    privacy@navigator.ai
                                </a>
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-5 mt-12">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        © {new Date().getFullYear()} Navigator. All rights reserved.
                    </p>
                    <a
                        href="/terms"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Terms of Service
                    </a>
                </div>
            </footer>
        </div>
    );
}
