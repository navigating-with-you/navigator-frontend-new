import { Shield } from "lucide-react";
import LegalPageLayout from "@/components/layout/LegalPageLayout";

const EFFECTIVE_DATE = "June 1, 2026";
const CONTACT_EMAIL = "privacy@navigator.ai";

export default function PrivacyPolicyPage() {
    return (
        <LegalPageLayout
            icon={Shield}
            title="Privacy Policy"
            footerLink={{ label: "Terms of Service", href: "/terms" }}
        >
            <div className="space-y-10">
                {/* Title block */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                        Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: {EFFECTIVE_DATE}
                    </p>
                </div>

                <div className="space-y-10 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">1. Who we are</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Navigator ("Navigator," "we," "us," or "our") is an AI-powered Knowledge Base platform
                            that helps organizations manage documents, organize information, and get instant answers
                            through intelligent AI chat. This Privacy Policy explains how we collect, use, disclose,
                            and safeguard your personal information when you use our platform and services
                            (collectively, the "Services").
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            By using the Services, you agree to the collection and use of information described in
                            this policy. If you do not agree, please discontinue use of the Services.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">2. Information we collect</h2>

                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-4">Account and identity information</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            When you create an account or are invited to an organization, we collect your name,
                            email address, job title, and authentication credentials (managed via our identity
                            provider, Kinde). We also collect your organization name, billing address, and
                            payment method details (processed by our payment partner — we do not store raw
                            card numbers).
                        </p>

                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-4">Content and documents</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We collect and process documents, files, and other content you upload to the platform.
                            This content may include text, images, PDFs, spreadsheets, and other file types. We
                            process this content to power search, AI-generated answers, and document organization
                            features. See our <a href="/data-usage-policy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Data Usage Policy</a> for
                            details on how documents are processed by our AI systems.
                        </p>

                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-4">AI interaction data</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            When you use our AI chat and search features, we collect your queries, the AI-generated
                            responses, conversation history, and feedback you provide (such as thumbs up/down ratings).
                            This data is used to deliver the AI features and improve response quality within your
                            organization's context — not to train global AI models.
                        </p>

                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-4">Usage and technical data</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We automatically collect technical information when you use the Services, including
                            IP address, browser type and version, operating system, device identifiers, pages visited,
                            features used, actions taken, timestamps, referrer URLs, and error logs. This data is
                            used for security monitoring, performance optimization, and product improvement.
                        </p>

                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-4">Communications</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            If you contact our support team or send us email, we retain those communications and
                            any information you include in them to help us resolve your inquiry and improve
                            our support quality.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">3. How we use your information</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">We use the information we collect to:</p>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li>Create and manage your account and your organization's workspace</li>
                            <li>Provide, operate, maintain, and improve the Services</li>
                            <li>Power AI search, question-answering, and document analysis features</li>
                            <li>Process payments and manage subscriptions</li>
                            <li>Send transactional communications (account notifications, invitations, security alerts)</li>
                            <li>Enforce our Terms of Service and prevent fraud, abuse, or unauthorized access</li>
                            <li>Comply with applicable legal obligations</li>
                            <li>Analyze usage patterns to improve the platform (using aggregated, de-identified data)</li>
                        </ul>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We do not sell your personal data, use your documents or AI conversations to train
                            third-party AI models, or process your data for targeted advertising.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">4. How we share your information</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">We share personal data only in the following circumstances:</p>

                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-4">Service providers</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We use trusted third-party service providers to help deliver the Services, including
                            cloud infrastructure (AWS), identity management (Kinde), AI model providers (OpenAI,
                            Google), document processing (LlamaParse), payment processing, and customer support.
                            These providers are contractually bound to process your data only for the purposes
                            we specify and to maintain appropriate security measures.
                        </p>

                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-4">Within your organization</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Information you upload or share within your organization's Navigator workspace is
                            accessible to other members of your organization based on the permissions and roles
                            configured by your organization's administrators.
                        </p>

                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-4">Legal requirements</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We may disclose your information if required by law, subpoena, court order, or
                            governmental authority, or if we believe in good faith that disclosure is necessary
                            to protect our rights, your safety, or the safety of others.
                        </p>

                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-4">Business transfers</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            If Navigator is involved in a merger, acquisition, financing, or sale of assets,
                            your information may be transferred as part of that transaction. We will provide
                            notice before your data is transferred and becomes subject to a different privacy policy.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">5. Data retention</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We retain your personal data for as long as your account is active or as needed to
                            provide the Services. When you delete your account or your organization's subscription
                            ends, we will delete or anonymize your personal data within 90 days, unless we are
                            required to retain it for legal or compliance obligations (such as tax records or
                            fraud prevention). Document content and AI conversation history may be deleted sooner
                            upon your request.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">6. Data security</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We implement industry-standard technical and organizational security measures to
                            protect your data, including:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li>Encryption in transit (TLS 1.2+) and at rest (AES-256)</li>
                            <li>Role-based access control (RBAC) enforced by OpenFGA</li>
                            <li>Multi-tenant data isolation — your organization's data is logically separated</li>
                            <li>Regular security reviews and vulnerability assessments</li>
                            <li>Access logging and anomaly detection</li>
                        </ul>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            No method of transmission over the internet or electronic storage is 100% secure.
                            If you believe your account has been compromised, contact us immediately at{" "}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{CONTACT_EMAIL}</a>.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">7. Your privacy rights</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Depending on your state of residence, you may have the following rights regarding
                            your personal data:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to access</span> — request a copy of the personal data we hold about you</li>
                            <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to correct</span> — request correction of inaccurate data</li>
                            <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to delete</span> — request deletion of your personal data, subject to legal retention obligations</li>
                            <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to data portability</span> — receive your data in a structured, machine-readable format</li>
                            <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to opt out of sale</span> — we do not sell your data, but you may opt out of any data sharing for third-party advertising (we do not engage in this)</li>
                            <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to non-discrimination</span> — we will not discriminate against you for exercising any privacy right</li>
                            <li><span className="font-medium text-zinc-700 dark:text-zinc-300">Right to appeal</span> — appeal our response to your privacy request</li>
                        </ul>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            These rights apply under CCPA/CPRA (California), VCDPA (Virginia), CPA (Colorado),
                            CTDPA (Connecticut), and other applicable US state privacy laws. To submit a request,
                            email{" "}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{CONTACT_EMAIL}</a>.
                            We will respond within 45 days, with a possible extension of 45 additional days
                            where permitted by law.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">8. Cookies and tracking</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We use session cookies and local storage to maintain your authentication state,
                            remember your preferences (such as theme settings), and ensure the platform
                            functions correctly. We do not use third-party advertising cookies or cross-site
                            tracking technologies. You may configure your browser to refuse cookies, but some
                            features of the Services may not function correctly without them.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">9. Children's privacy</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            The Services are intended for business use by adults (18 years or older). We do not
                            knowingly collect personal data from individuals under 13, or under 16 where
                            heightened protections apply under state law. If we become aware that we have
                            inadvertently collected such data, we will delete it promptly. If you believe a
                            minor has provided us personal data, contact us at{" "}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">{CONTACT_EMAIL}</a>.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">10. Changes to this policy</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We may update this Privacy Policy from time to time. When we make material changes,
                            we will notify you via email and/or a prominent notice within the platform at least
                            30 days before the changes take effect. The "Last updated" date at the top of this
                            page reflects the most recent revision.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">11. Contact us</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            For privacy questions, requests, or complaints, contact our Privacy team:
                        </p>
                        <address className="not-italic text-zinc-600 dark:text-zinc-400 space-y-1">
                            <p className="font-medium text-zinc-700 dark:text-zinc-300">Navigator Privacy Team</p>
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
