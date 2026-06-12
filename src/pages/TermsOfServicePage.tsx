import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfServicePage() {
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
                        <FileText className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-semibold">Terms of Service</span>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-12">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                            Effective date: To be announced
                        </p>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 px-5 py-4">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-1">
                            Document in preparation
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-500 leading-relaxed">
                            Our Terms of Service are currently being prepared by our legal team and will be published
                            prior to the public launch of Navigator. They will govern your use of the Navigator platform
                            and outline the rights and obligations of both Navigator and its users.
                        </p>
                    </div>

                    <div className="space-y-8 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                What our Terms of Service will cover
                            </h2>
                            <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                                <li>Eligibility and account registration requirements</li>
                                <li>Acceptable use of the Navigator platform</li>
                                <li>Subscription plans, billing, and refund policies</li>
                                <li>Intellectual property rights and content ownership</li>
                                <li>Limitation of liability and disclaimers</li>
                                <li>Termination and account suspension</li>
                                <li>Governing law and dispute resolution (arbitration clause)</li>
                                <li>Changes to these terms and notification procedures</li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Governing law
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                These Terms will be governed by and construed in accordance with the laws of
                                the United States and the state in which Navigator is incorporated,
                                without regard to conflict of law provisions.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Contact
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                For questions about these Terms, contact us at{" "}
                                <a
                                    href="mailto:legal@navigator.ai"
                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                >
                                    legal@navigator.ai
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
                        href="/privacy-policy"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Privacy Policy
                    </a>
                </div>
            </footer>
        </div>
    );
}
