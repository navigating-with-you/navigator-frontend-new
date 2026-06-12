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
                            and protect your personal data in compliance with applicable US state and federal
                            privacy laws and regulations.
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
                                <li>Your rights under applicable US state privacy laws</li>
                                <li>How to exercise your right to access, correct, or delete your data</li>
                                <li>How we protect your data with security measures</li>
                                <li>How to contact us with privacy questions or complaints</li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Applicable US state privacy laws
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Navigator is committed to complying with all applicable US state privacy laws,
                                including but not limited to:
                            </p>
                            <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">California</span> — CCPA / CPRA (California Consumer Privacy Act / California Privacy Rights Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Virginia</span> — VCDPA (Virginia Consumer Data Protection Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Colorado</span> — CPA (Colorado Privacy Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Connecticut</span> — CTDPA (Connecticut Data Privacy Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Utah</span> — UCPA (Utah Consumer Privacy Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Texas</span> — TDPSA (Texas Data Privacy and Security Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Oregon</span> — OCPA (Oregon Consumer Privacy Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Montana</span> — MCDPA (Montana Consumer Data Privacy Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Florida</span> — FDBR (Florida Digital Bill of Rights)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Delaware</span> — DPDPA (Delaware Personal Data Privacy Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Iowa</span> — ICDPA (Iowa Consumer Data Protection Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Indiana</span> — ICDPA (Indiana Consumer Data Protection Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Tennessee</span> — TIPA (Tennessee Information Protection Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Minnesota</span> — MNDPA (Minnesota Consumer Data Privacy Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Maryland</span> — MODPA (Maryland Online Data Privacy Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Nebraska</span> — NDPA (Nebraska Data Privacy Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">New Hampshire</span> — NHPA (New Hampshire Privacy Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">New Jersey</span> — NJDPA (New Jersey Data Privacy Act)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Rhode Island</span> — RIDTPPA (Rhode Island Data Transparency and Privacy Protection Act)</li>
                            </ul>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                As additional states enact privacy legislation, we will update this policy
                                accordingly to maintain compliance nationwide.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Your privacy rights
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Depending on the state in which you reside, you may have some or all of the
                                following rights regarding your personal data:
                            </p>
                            <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to know / access</span> — request a copy of the personal data we hold about you</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to correct</span> — request correction of inaccurate personal data</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to delete</span> — request deletion of your personal data, subject to certain exceptions</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to data portability</span> — receive your data in a structured, machine-readable format</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to opt out of sale</span> — opt out of the sale or sharing of your personal data</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to opt out of targeted advertising</span> — opt out of processing for targeted advertising purposes</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to opt out of profiling</span> — opt out of automated profiling that produces legal or similarly significant effects</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to limit sensitive data use</span> — limit or opt in to processing of sensitive personal information (varies by state)</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to non-discrimination</span> — we will not discriminate against you for exercising any privacy right</li>
                                <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to appeal</span> — appeal our response to your privacy request (required in several states)</li>
                            </ul>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                You can already exercise many of these rights directly from your{" "}
                                <a href="/profile" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                    Profile page
                                </a>
                                . To submit a formal privacy request, contact us using the details below.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Sensitive personal information
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Several state laws impose heightened protections on sensitive categories of personal
                                data, including health information, precise geolocation, biometric identifiers,
                                racial or ethnic origin, religious beliefs, immigration status, financial account
                                details, and sexual orientation or gender identity. Navigator will not process
                                sensitive personal information beyond what is strictly necessary to provide the
                                service, and will obtain opt-in consent where required by applicable law.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Children's privacy
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                Navigator is not directed to children under 13, and we do not knowingly collect
                                personal data from children under 13. Several state laws extend protections to
                                individuals under 16 or 18; we will comply with applicable age-appropriate
                                requirements in each state.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Contact &amp; privacy requests
                            </h2>
                            <p className="text-zinc-600 dark:text-zinc-400">
                                To exercise any of your privacy rights, submit a request or appeal, or ask
                                questions about this policy, contact our Privacy team at{" "}
                                <a
                                    href="mailto:privacy@navigator.ai"
                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                >
                                    privacy@navigator.ai
                                </a>
                                . We will respond within the timeframe required by your state's law (typically
                                45 days, with an allowed extension of up to 45 additional days where reasonably
                                necessary).
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
