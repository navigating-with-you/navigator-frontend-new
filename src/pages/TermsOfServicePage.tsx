import { FileText } from "lucide-react";
import LegalPageLayout from "@/components/layout/LegalPageLayout";

const EFFECTIVE_DATE = "June 1, 2026";
const CONTACT_EMAIL = "legal@navigator.ai";

export default function TermsOfServicePage() {
    return (
        <LegalPageLayout
            icon={FileText}
            title="Terms & Conditions"
            footerLink={{ label: "Privacy Policy", href: "/privacy-policy" }}
        >
            <div className="space-y-10">
                {/* Title block */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Terms & Conditions</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                        Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: {EFFECTIVE_DATE}
                    </p>
                </div>

                <div className="space-y-10 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">1. Acceptance of terms</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            By accessing or using the Navigator platform and services (the "Services"), you
                            ("User" or "you") agree to be bound by these Terms &amp; Conditions ("Terms")
                            and our{" "}
                            <a href="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Privacy Policy</a>. If you are
                            using the Services on behalf of an organization, you represent that you have the
                            authority to bind that organization to these Terms, and "you" refers to both you
                            individually and that organization.
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            If you do not agree to these Terms, do not use the Services. We reserve the right
                            to update these Terms at any time; continued use after notice of changes constitutes
                            acceptance of the revised Terms.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">2. Description of services</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Navigator provides an AI-powered Knowledge Base platform for organizations, including:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li>Document upload, storage, and organization in a multi-tenant knowledge base</li>
                            <li>OCR extraction and text parsing for uploaded files</li>
                            <li>AI-powered search and question-answering (RAG) over your documents</li>
                            <li>Role-based access control for team collaboration</li>
                            <li>Real-time notifications and document processing status</li>
                        </ul>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We reserve the right to modify, suspend, or discontinue any feature or aspect of
                            the Services at any time with reasonable notice.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">3. Account registration and security</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            To use the Services, you must create an account or accept an invitation from an
                            organization administrator. You agree to:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li>Provide accurate, current, and complete information during registration</li>
                            <li>Maintain and promptly update your account information</li>
                            <li>Keep your login credentials confidential and not share them with others</li>
                            <li>Notify us immediately at{" "}
                                <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{CONTACT_EMAIL}</a>{" "}
                                of any unauthorized use of your account</li>
                            <li>Accept responsibility for all activity that occurs under your account</li>
                        </ul>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We reserve the right to suspend or terminate accounts that violate these Terms,
                            are associated with fraudulent activity, or pose a security risk.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">4. Acceptable use policy</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">You agree not to use the Services to:</p>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li>Violate any applicable federal, state, or local law or regulation</li>
                            <li>Upload, store, or process content that infringes any third-party intellectual property rights</li>
                            <li>Upload malicious code, viruses, or any software designed to damage or gain unauthorized access to systems</li>
                            <li>Attempt to reverse-engineer, decompile, or extract the source code of the Services</li>
                            <li>Use automated tools to scrape, index, or extract data from the platform without authorization</li>
                            <li>Circumvent any access controls, rate limits, or security measures</li>
                            <li>Use the AI features to generate content that is illegal, harmful, defamatory, or violates third-party rights</li>
                            <li>Impersonate any person, entity, or organization</li>
                            <li>Interfere with or disrupt the integrity or performance of the Services</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">5. Subscription plans and payment</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Access to certain features requires a paid subscription. By subscribing, you agree to:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li>Pay all fees associated with your selected plan, billed in advance on a monthly or annual basis</li>
                            <li>Authorize us to charge your payment method on file for recurring subscription fees</li>
                            <li>Provide accurate and complete payment information</li>
                        </ul>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Subscriptions automatically renew unless canceled before the renewal date. You may
                            cancel your subscription at any time from your account settings; cancellation takes
                            effect at the end of the current billing period. We do not provide refunds for
                            partial subscription periods, except where required by applicable state law
                            (including auto-renewal cancellation rights under applicable state consumer
                            protection laws).
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We reserve the right to change pricing with at least 30 days' advance notice.
                            Continued use of the Services after a price change constitutes acceptance of the
                            new pricing.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">6. Intellectual property</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Navigator's IP:</span>{" "}
                            The Services, including all software, algorithms, UI designs, trademarks, logos,
                            and documentation, are owned by Navigator and protected by applicable intellectual
                            property laws. These Terms do not grant you any ownership rights in the Services.
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Your content:</span>{" "}
                            You retain full ownership of all documents, files, and content you upload to the
                            platform ("User Content"). By uploading User Content, you grant Navigator a
                            limited, non-exclusive, royalty-free license to process, store, and display
                            your content solely for the purpose of providing the Services to you.
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            You represent and warrant that you have all necessary rights, licenses, and
                            permissions to upload your User Content and to grant Navigator the rights
                            described above.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">7. AI-generated content disclaimer</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Navigator uses artificial intelligence to assist with document analysis, search,
                            and question-answering. You acknowledge and agree that:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li>AI-generated responses may contain errors, inaccuracies, or omissions</li>
                            <li>AI responses are not a substitute for professional legal, financial, medical, or other expert advice</li>
                            <li>You are solely responsible for independently verifying AI-generated information before relying on it</li>
                            <li>Navigator makes no warranty regarding the accuracy, completeness, or fitness for any purpose of AI-generated content</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">8. Disclaimer of warranties</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY
                            KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO
                            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT,
                            AND ANY WARRANTIES ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            NAVIGATOR DOES NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE,
                            SECURE, OR THAT ANY DEFECTS WILL BE CORRECTED. Some states do not allow the
                            exclusion of implied warranties; the above may not apply to you to the extent
                            prohibited by your state's law.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">9. Limitation of liability</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NAVIGATOR AND ITS OFFICERS,
                            DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE,
                            DATA, OR GOODWILL, ARISING FROM OR RELATED TO THESE TERMS OR YOUR USE OF THE
                            SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM OR RELATED TO
                            THE SERVICES WILL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES PAID BY YOU TO
                            NAVIGATOR IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) $100. Some states do not
                            allow limitations on implied warranties or exclusion of incidental damages; this
                            limitation may not apply to you.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">10. Indemnification</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            You agree to defend, indemnify, and hold harmless Navigator and its officers,
                            directors, employees, and agents from and against any claims, liabilities,
                            damages, losses, and expenses (including reasonable attorneys' fees) arising from
                            (a) your use of the Services in violation of these Terms, (b) your User Content,
                            or (c) your violation of any third-party rights.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">11. Termination</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            You may terminate your account at any time by contacting us or through your account
                            settings. We may suspend or terminate your access to the Services immediately,
                            without prior notice or liability, if you breach these Terms or if we reasonably
                            believe your account poses a security risk or legal liability.
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Upon termination, your right to use the Services ceases immediately. Provisions
                            of these Terms that by their nature should survive termination — including
                            intellectual property, disclaimers, limitation of liability, and governing law —
                            will survive.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">12. Governing law and disputes</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            These Terms are governed by the laws of the United States and the state in which
                            Navigator is incorporated, without regard to conflict of law provisions. You and
                            Navigator agree to resolve any disputes through binding individual arbitration
                            rather than class actions or jury trials, except where prohibited by applicable
                            state law. Nothing in these Terms limits rights you may have under applicable
                            US state consumer protection laws.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">13. Changes to these terms</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We may update these Terms from time to time. When we make material changes, we
                            will notify you via email and/or a prominent notice within the platform at least
                            30 days before the changes take effect. Your continued use of the Services after
                            the effective date of the revised Terms constitutes your acceptance of the changes.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">14. Contact</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            For questions about these Terms, contact our legal team:
                        </p>
                        <address className="not-italic text-zinc-600 dark:text-zinc-400 space-y-1">
                            <p className="font-medium text-zinc-700 dark:text-zinc-300">Navigator Legal Team</p>
                            <p>
                                Email:{" "}
                                <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{CONTACT_EMAIL}</a>
                            </p>
                        </address>
                    </section>

                </div>
            </div>
        </LegalPageLayout>
    );
}
