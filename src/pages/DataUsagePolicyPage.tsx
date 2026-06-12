import { Database } from "lucide-react";
import LegalPageLayout from "@/components/layout/LegalPageLayout";

const EFFECTIVE_DATE = "June 1, 2026";
const CONTACT_EMAIL = "privacy@navigator.ai";

export default function DataUsagePolicyPage() {
    return (
        <LegalPageLayout
            icon={Database}
            title="Data Usage Policy"
            footerLink={{ label: "Privacy Policy", href: "/privacy-policy" }}
        >
            <div className="space-y-10">
                {/* Title block */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Data Usage Policy</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                        Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Last updated: {EFFECTIVE_DATE}
                    </p>
                </div>

                <div className="space-y-10 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">1. Overview</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            This Data Usage Policy explains specifically how Navigator processes the data you
                            upload and interact with through our AI-powered features. It supplements our{" "}
                            <a href="/privacy-policy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Privacy Policy</a>{" "}
                            and is intended to give you clear, transparent information about how your documents
                            and AI interactions are handled.
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">Core commitment:</span>{" "}
                            Your data is used exclusively to deliver and improve the Services for your
                            organization. We do not use your documents or conversations to train general AI
                            models or sell your data to third parties.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">2. Data we process on your behalf</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            When you use Navigator, we process the following categories of data:
                        </p>

                        <div className="space-y-4 mt-2">
                            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-1.5">
                                <p className="font-semibold text-zinc-800 dark:text-zinc-200">Documents and files</p>
                                <p className="text-zinc-600 dark:text-zinc-400">
                                    Text, PDFs, images, spreadsheets, and other files you upload. These are stored
                                    in encrypted cloud storage (AWS S3) and processed by our OCR pipeline (LlamaParse)
                                    to extract text for indexing and AI retrieval.
                                </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-1.5">
                                <p className="font-semibold text-zinc-800 dark:text-zinc-200">Document embeddings</p>
                                <p className="text-zinc-600 dark:text-zinc-400">
                                    Extracted text from your documents is converted into vector embeddings — numerical
                                    representations that enable semantic search. Embeddings are stored in our vector
                                    database (Turbopuffer) and are isolated per organization. Embeddings cannot be
                                    reversed to reconstruct the original document.
                                </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-1.5">
                                <p className="font-semibold text-zinc-800 dark:text-zinc-200">AI chat conversations</p>
                                <p className="text-zinc-600 dark:text-zinc-400">
                                    Your questions and the AI-generated responses are stored as conversation history,
                                    allowing you to reference past interactions. Conversations are stored in our
                                    encrypted database (PostgreSQL on AWS RDS) and are accessible only to the user
                                    who created them and authorized organization administrators.
                                </p>
                            </div>
                            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-1.5">
                                <p className="font-semibold text-zinc-800 dark:text-zinc-200">Search queries</p>
                                <p className="text-zinc-600 dark:text-zinc-400">
                                    Search queries submitted through the AI chat interface are temporarily cached
                                    in Redis for performance purposes and retained in conversation history. Raw
                                    search queries are not shared with third parties beyond the AI model provider
                                    necessary to generate a response.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">3. How AI retrieval (RAG) works</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Navigator uses Retrieval-Augmented Generation (RAG) to answer questions about
                            your documents. Here is how data flows through this process:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Document ingestion:</span>{" "}
                                When you upload a file, it is processed by our OCR pipeline to extract text,
                                chunked into segments, and converted into vector embeddings.
                            </li>
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Query processing:</span>{" "}
                                When you ask a question, it is converted into a query embedding and compared
                                against your organization's document embeddings to find the most relevant
                                text chunks.
                            </li>
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">AI generation:</span>{" "}
                                The relevant text chunks, along with your question and conversation context,
                                are sent to our AI model provider (OpenAI or Google Gemini) to generate
                                a response. Only the relevant context chunks — not your entire document library
                                — are transmitted.
                            </li>
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Response delivery:</span>{" "}
                                The AI response is returned to you and saved to your conversation history.
                            </li>
                        </ol>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            All document context sent to AI model providers is governed by our data processing
                            agreements with those providers. We use API access, which means your data is not
                            used by these providers to train their models.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">4. What we do not do with your data</h2>
                        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                            {[
                                ["We do not sell your data", "Your documents, embeddings, conversations, or personal information are never sold to any third party."],
                                ["We do not train AI models on your data", "Your documents and AI interactions are not used to train, fine-tune, or improve any AI model — including Navigator's own models or those of our AI providers."],
                                ["We do not access your documents without authorization", "Navigator employees do not access your document content except when explicitly required to resolve a technical issue you have reported, and only with your organization administrator's consent."],
                                ["We do not share data across organizations", "Your organization's documents, embeddings, and conversations are strictly isolated and are never accessible to other Navigator customers."],
                                ["We do not use your data for advertising", "We do not use your data for any advertising, marketing profiling, or audience targeting purposes."],
                            ].map(([title, desc]) => (
                                <div key={title} className="px-4 py-3.5 space-y-1">
                                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
                                    <p className="text-zinc-600 dark:text-zinc-400">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">5. Third-party AI providers</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Navigator uses the following AI providers to power our AI features. When you
                            submit a query, relevant document context is sent to the active provider:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">OpenAI</span> —
                                used for language model responses and embeddings. We use the API with a
                                zero data retention agreement where available; OpenAI does not use API
                                data to train its models.
                            </li>
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Google Gemini</span> —
                                used as an alternative language model provider. Similar API data protections apply.
                            </li>
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">LlamaParse</span> —
                                used for document OCR and parsing. Files sent for parsing are governed by
                                LlamaParse's API terms, which prohibit using API data for training.
                            </li>
                        </ul>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We maintain Data Processing Agreements (DPAs) with all AI providers that process
                            your content, ensuring contractual commitments to data confidentiality and
                            non-use for model training.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">6. Data retention and deletion</h2>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Documents:</span>{" "}
                                Retained for the life of your subscription. Deleted within 30 days when you
                                remove them or cancel your subscription.
                            </li>
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Document embeddings:</span>{" "}
                                Deleted automatically when the corresponding document is deleted.
                            </li>
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">AI conversations:</span>{" "}
                                Retained for the life of your account. You can delete individual conversations
                                from the chat interface at any time.
                            </li>
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Cache data:</span>{" "}
                                Temporary search and response caches expire automatically (typically within
                                24 hours) and are never persisted to long-term storage.
                            </li>
                            <li>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Account deletion:</span>{" "}
                                When you delete your account or your organization's subscription ends, all
                                associated data is deleted within 90 days.
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">7. Security measures</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We protect your data with the following controls:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li>All data encrypted in transit using TLS 1.2+ and at rest using AES-256</li>
                            <li>Multi-tenant isolation — each organization's data is logically separated at the database and vector store level</li>
                            <li>Access controlled by role-based permissions (RBAC via OpenFGA)</li>
                            <li>Audit logging for all sensitive data operations</li>
                            <li>Automated security scanning and dependency vulnerability checks</li>
                            <li>No document content exposed via logs or error messages</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">8. Your controls</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            You have the following controls over how your data is used:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-zinc-600 dark:text-zinc-400">
                            <li>Delete individual documents from the Knowledge Base at any time</li>
                            <li>Delete individual AI conversations from the chat interface</li>
                            <li>Request a full export of your organization's data by contacting us</li>
                            <li>Request deletion of all your data by contacting us or deleting your account</li>
                            <li>Control who in your organization can access documents via role-based permissions</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">9. Changes to this policy</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            We will notify you of material changes to this policy via email and in-app notice
                            at least 30 days before changes take effect. The "Last updated" date at the top
                            reflects the most recent revision.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">10. Contact</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            For questions about how your data is used, contact our Privacy team:
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
