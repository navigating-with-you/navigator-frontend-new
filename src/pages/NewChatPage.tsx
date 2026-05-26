import {
    useState,
    useEffect,
    useRef,
    useCallback,
    type JSX,
} from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    ArrowUp,
    FileText,
    ChevronDown,
    Copy,
    RotateCcw,
    Share2,
    Square,
    Cpu,
} from "lucide-react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    sendChatQueryStream,
    createConversation,
    getConversation,
    updateConversation,
    type ChatMessage,
    type Citation,
    type Conversation,
    type ThinkingStep,
} from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    statusText?: string;
    sources?: Citation[];
    isStreaming?: boolean;
    thinkingSteps?: ThinkingStep[];
}

// ── Thinking steps display text ───────────────────────────────────────────────
const THINKING_STEP_LABELS: Record<string, string> = {
    understanding: "Understanding your question...",
    planning: "Planning my approach...",
    decomposing: "Breaking down the query...",
    searching: "Searching knowledge base...",
    evaluating: "Evaluating results...",
    reranking: "Ranking relevant sources...",
    refining: "Refining the answer...",
    synthesizing: "Synthesizing information...",
    answering: "Generating response...",
};

// ── Typing dots component ─────────────────────────────────────────────────────
function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-[typingDot_1.4s_ease-in-out_0s_infinite]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-[typingDot_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-[typingDot_1.4s_ease-in-out_0.4s_infinite]" />
        </span>
    );
}

// ── Thinking Accordion Component ──────────────────────────────────────────────
interface ThinkingAccordionProps {
    isStreaming: boolean;
    thinkingSteps: ThinkingStep[];
}

function ThinkingAccordion({ isStreaming, thinkingSteps }: ThinkingAccordionProps) {
    const [isExpanded, setIsExpanded] = useState(isStreaming);

    useEffect(() => {
        if (isStreaming) {
            setIsExpanded(true);
        }
    }, [isStreaming]);

    if (!thinkingSteps || thinkingSteps.length === 0) return null;

    const lastStep = thinkingSteps[thinkingSteps.length - 1];

    // Status bullet color
    const dotClass = isStreaming
        ? "bg-blue-500 animate-pulse"
        : "bg-emerald-500";

    // Header text
    let headerText = "";
    if (isStreaming) {
        headerText = lastStep?.message || "Thinking...";
    } else {
        const hasSearch = thinkingSteps.some(s =>
            s.step === "searching" ||
            s.message.toLowerCase().includes("search") ||
            s.message.toLowerCase().includes("brows")
        );
        if (hasSearch) {
            headerText = "Finished browsing the web and documents";
        } else if (lastStep?.message.startsWith("Drafting")) {
            headerText = lastStep.message.replace("Drafting", "Drafted");
        } else {
            headerText = lastStep?.message || "Completed thinking steps";
        }
    }

    return (
        <div className="w-full mb-3 select-none">
            {/* Header row */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between py-1 cursor-pointer group hover:opacity-90 transition-opacity"
            >
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
                    <span>{headerText}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                    <span>{isExpanded ? "Collapse" : "Expand"}</span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
                </div>
            </div>

            {/* Collapsible list */}
            {isExpanded && (
                <div className="mt-1.5 p-3 px-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {thinkingSteps.map((step, idx) => {
                        const messageLower = step.message.toLowerCase();
                        const isSearch = step.step === "searching" || messageLower.includes("search");
                        const isBrowsing = messageLower.includes("brows") || messageLower.includes("web");

                        return (
                            <div key={idx} className="flex items-center gap-2.5">
                                {isSearch ? (
                                    <span className="text-zinc-400 text-xs shrink-0 select-none">🔍</span>
                                ) : isBrowsing ? (
                                    <span className="text-zinc-400 text-xs shrink-0 select-none">🌐</span>
                                ) : (
                                    <span className="text-zinc-400 text-[10px] shrink-0 select-none">➡️</span>
                                )}
                                <span className="leading-normal">{step.message}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Citation Reference Lookup Helper ──────────────────────────────────────────
const getCitationForReference = (
    refType: "Source" | "Web",
    index: number,
    citations?: Citation[]
): Citation | undefined => {
    if (!citations) return undefined;
    if (refType === "Source") {
        const internalCitations = citations.filter(c => c.file_id !== null && c.file_id !== undefined);
        return internalCitations[index - 1];
    } else {
        const webCitations = citations.filter(c => c.file_id === null || c.file_id === undefined);
        return webCitations[index - 1];
    }
};

// ── Render message markdown-lite ──────────────────────────────────────────────
function MessageContent({
    content,
    citations,
    isStreaming,
}: {
    content: string;
    citations?: Citation[];
    isStreaming?: boolean;
}): JSX.Element {
    if (!content && isStreaming) {
        return <TypingDots />;
    }

    const lines = content.split("\n");

    return (
        <div className="space-y-2 text-sm leading-relaxed">
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={idx} className="h-1" />;

                // H3: ###
                if (trimmed.startsWith("### ")) {
                    return (
                        <p key={idx} className="font-semibold text-zinc-900 dark:text-zinc-100 mt-3 first:mt-0 text-[13px]">
                            {formatInline(trimmed.slice(4), citations)}
                        </p>
                    );
                }

                // H2: ##
                if (trimmed.startsWith("## ")) {
                    return (
                        <p key={idx} className="font-bold text-zinc-900 dark:text-zinc-100 mt-4 first:mt-0 text-sm">
                            {formatInline(trimmed.slice(3), citations)}
                        </p>
                    );
                }

                // Bold line: **text**
                if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4) {
                    return (
                        <p key={idx} className="font-semibold text-zinc-900 dark:text-zinc-100 mt-3 first:mt-0">
                            {formatInline(trimmed.slice(2, -2), citations)}
                        </p>
                    );
                }

                // Bullet: * or -
                const bulletMatch = line.match(/^(\s*)[*\-]\s+(.+)/);
                if (bulletMatch) {
                    const indent = bulletMatch[1].length;
                    return (
                        <div key={idx} className={cn("flex items-start gap-2", indent > 0 ? "pl-6" : "pl-2")}>
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-zinc-400 shrink-0" />
                            <span className="text-zinc-700 dark:text-zinc-300">{formatInline(bulletMatch[2], citations)}</span>
                        </div>
                    );
                }

                // Numbered list: 1. text
                const numMatch = line.match(/^\s*(\d+)\.\s+(.+)/);
                if (numMatch) {
                    return (
                        <div key={idx} className="flex items-start gap-2 pl-2">
                            <span className="shrink-0 text-xs font-semibold text-zinc-400 mt-0.5 w-4">{numMatch[1]}.</span>
                            <span className="text-zinc-700 dark:text-zinc-300">{formatInline(numMatch[2], citations)}</span>
                        </div>
                    );
                }

                // Plain paragraph
                return (
                    <p key={idx} className="text-zinc-700 dark:text-zinc-300">
                        {formatInline(trimmed, citations)}
                    </p>
                );
            })}
            {isStreaming && content && <TypingDots />}
        </div>
    );
}

/** Apply bold/italic inline formatting + citation pill replacements */
function formatInline(text: string, citations?: Citation[]): JSX.Element {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[Source \d+\]|\[Web \d+\])/g);
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                        <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatInline(part.slice(2, -2), citations)}
                        </strong>
                    );
                }
                if (part.startsWith("*") && part.endsWith("*")) {
                    return <em key={i}>{formatInline(part.slice(1, -1), citations)}</em>;
                }

                const citationMatch = part.match(/^\[(Source|Web) (\d+)\]$/);
                if (citationMatch) {
                    const type = citationMatch[1] as "Source" | "Web";
                    const index = parseInt(citationMatch[2], 10);
                    const citation = getCitationForReference(type, index, citations);

                    if (citation) {
                        const isWeb = type === "Web";
                        return (
                            <span
                                key={i}
                                onClick={() => {
                                    if (isWeb && citation.heading_path) {
                                        window.open(citation.heading_path, "_blank");
                                    } else {
                                        toast.info(`Document source: ${citation.filename}`);
                                    }
                                }}
                                title={citation.content_preview || citation.filename}
                                className={cn(
                                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer select-none mx-0.5 relative -top-[1px]",
                                    isWeb
                                        ? "bg-amber-50 hover:bg-amber-100 border-amber-200/50 text-amber-800 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 dark:border-amber-900/40 dark:text-amber-300"
                                        : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                                )}
                            >
                                {isWeb ? (
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                                ) : (
                                    <FileText className="h-3 w-3 shrink-0 text-zinc-500" />
                                )}
                                <span className="max-w-[120px] truncate">{citation.filename}</span>
                            </span>
                        );
                    }
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function NewChatPage(): JSX.Element {
    const { user, isLoading: authLoading, getToken } = useKindeAuth();
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<any>(null);
    const [inputVal, setInputVal] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isResponding, setIsResponding] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [greeting, setGreeting] = useState("Good Morning");
    const [selectedModel, setSelectedModel] = useState("Auto");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [thinkingLabel, setThinkingLabel] = useState("Thinking...");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isCreatingConversationRef = useRef(false);
    const isAtBottomRef = useRef(true);

    // ── Scroll helpers ────────────────────────────────────────────────────────

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    }, []);

    const handleScroll = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        isAtBottomRef.current = distFromBottom < 80;
    }, []);

    // Scroll to bottom when a new message arrives (only if already at bottom)
    useEffect(() => {
        if (isAtBottomRef.current || isResponding) {
            scrollToBottom(messages.length <= 2 ? "instant" : "smooth");
        }
    }, [messages, isResponding, scrollToBottom]);

    // ── Load conversation ─────────────────────────────────────────────────────

    const loadConversationById = useCallback(async (convId: string) => {
        try {
            setIsLoadingMessages(true);
            const token = await getToken();
            if (!token) return;
            const conv = await getConversation(convId, token);
            const mapped: Message[] = conv.messages
                .map((m: ChatMessage) => ({
                    id: m.id,
                    role: m.role as "user" | "assistant",
                    content: m.content,
                    timestamp: new Date(m.created_at),
                    sources: m.citations ?? undefined,
                    thinkingSteps: m.thinking_steps ?? undefined,
                    statusText:
                        m.citations && m.citations.length > 0
                            ? "Retrieved from documents"
                            : undefined,
                }))
                .sort((a, b) => {
                    const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
                    if (timeDiff !== 0) return timeDiff;
                    // Tiebreaker: user messages always come before assistant messages
                    if (a.role === "user" && b.role === "assistant") return -1;
                    if (a.role === "assistant" && b.role === "user") return 1;
                    return 0;
                });
            setMessages(mapped);
            setConversationId(conv.id);
        } catch (err: any) {
            toast.error(err.message || "Failed to load conversation");
        } finally {
            setIsLoadingMessages(false);
        }
    }, [getToken]);

    const startNewChat = useCallback(() => {
        setConversationId(null);
        setMessages([]);
        setInputVal("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    }, []);

    // ── URL / route effects ───────────────────────────────────────────────────

    useEffect(() => {
        if (authLoading) return;
        if (id) {
            if (id !== conversationId) {
                if (isCreatingConversationRef.current) {
                    setConversationId(id);
                    isCreatingConversationRef.current = false;
                } else {
                    loadConversationById(id);
                }
            }
        } else {
            startNewChat();
        }
    }, [id, authLoading, loadConversationById, startNewChat]);

    useEffect(() => {
        const handleDeleted = (e: Event) => {
            const detail = (e as CustomEvent).detail as { id: string };
            if (detail?.id && detail.id === conversationId) navigate("/chat");
        };
        window.addEventListener("navigator_conversation_deleted", handleDeleted);
        return () => window.removeEventListener("navigator_conversation_deleted", handleDeleted);
    }, [conversationId, navigate]);

    useEffect(() => {
        const load = () => startNewChat();
        window.addEventListener("navigator_load_history", load);
        return () => window.removeEventListener("navigator_load_history", load);
    }, [startNewChat]);

    // ── Profile / greeting ────────────────────────────────────────────────────

    useEffect(() => {
        const stored = sessionStorage.getItem("navigator_user_profile");
        if (stored) {
            try { setProfile(JSON.parse(stored)); } catch { /* ignore */ }
        }
    }, [user]);

    useEffect(() => {
        const h = new Date().getHours();
        setGreeting(h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening");
    }, []);

    const displayName =
        profile?.display_name ||
        (user?.givenName
            ? `${user.givenName} ${user.familyName || ""}`.trim()
            : authLoading
                ? "Loading..."
                : "there");

    // ── Textarea resize helper ────────────────────────────────────────────────

    const resizeTextarea = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    };

    const resetTextarea = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
    };

    // ── Send message ──────────────────────────────────────────────────────────

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || isResponding) return;

        isAtBottomRef.current = true;

        const userMsg: Message = {
            id: `msg-${Date.now()}-user`,
            role: "user",
            content: text,
            timestamp: new Date(),
        };

        // Streaming placeholder for assistant
        const streamingId = `msg-${Date.now()}-streaming`;
        const streamingMsg: Message = {
            id: streamingId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isStreaming: true,
        };

        setMessages((prev) => [...prev, userMsg, streamingMsg]);
        setInputVal("");
        resetTextarea();
        setIsResponding(true);
        setThinkingLabel("Thinking...");

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const token = await getToken();

            if (!token) {
                // Dev mock fallback
                setTimeout(() => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === streamingId
                                ? { ...m, content: `I've received: "${text}". (Dev mode — no auth token)`, isStreaming: false }
                                : m
                        )
                    );
                    setIsResponding(false);
                }, 1200);
                return;
            }

            let convId = conversationId;
            const isNewConversation = !convId;

            if (!convId) {
                isCreatingConversationRef.current = true;
                try {
                    const conv: Conversation = await createConversation("Untitled", token);
                    convId = conv.id;
                    setConversationId(conv.id);
                    navigate(`/chat/${conv.id}`, { replace: true });
                    window.dispatchEvent(new Event("navigator_conversation_created"));
                } catch (convErr: any) {
                    isCreatingConversationRef.current = false;
                    throw convErr;
                }
            }

            let accumulatedContent = "";
            const citations: Citation[] = [];

            await sendChatQueryStream(
                {
                    query: text,
                    conversation_id: convId ?? undefined,
                    model: selectedModel === "Auto" ? undefined : selectedModel.toLowerCase(),
                },
                token,
                {
                    onThinking: (step, message) => {
                        const label = THINKING_STEP_LABELS[step] ?? message ?? "Thinking...";
                        setThinkingLabel(label);
                        setMessages((prev) =>
                            prev.map((m) => {
                                if (m.id !== streamingId) return m;
                                const existing = m.thinkingSteps || [];
                                const last = existing[existing.length - 1];
                                if (last && last.message === message) return m;
                                return {
                                    ...m,
                                    thinkingSteps: [
                                        ...existing,
                                        { step, message, timestamp: new Date().toISOString() },
                                    ],
                                };
                            })
                        );
                    },
                    onToolCall: (toolName, query) => {
                        const toolLabel = toolName === "search_knowledge_base"
                            ? "Searching knowledge base"
                            : toolName === "search_web"
                                ? "Searching the web"
                                : `Calling ${toolName}`;

                        setMessages((prev) =>
                            prev.map((m) => {
                                if (m.id !== streamingId) return m;
                                const existing = m.thinkingSteps || [];
                                return {
                                    ...m,
                                    thinkingSteps: [
                                        ...existing,
                                        {
                                            step: "searching",
                                            message: `${toolLabel} for: "${query.substring(0, 60)}${query.length > 60 ? "..." : ""}"`,
                                            timestamp: new Date().toISOString()
                                        },
                                    ],
                                };
                            })
                        );
                    },
                    onToolResult: (toolName, resultCount) => {
                        const toolLabel = toolName === "search_knowledge_base"
                            ? "Knowledge base search"
                            : toolName === "search_web"
                                ? "Web search"
                                : toolName;

                        setMessages((prev) =>
                            prev.map((m) => {
                                if (m.id !== streamingId) return m;
                                const existing = m.thinkingSteps || [];
                                return {
                                    ...m,
                                    thinkingSteps: [
                                        ...existing,
                                        {
                                            step: "searching",
                                            message: `${toolLabel} returned ${resultCount} result${resultCount !== 1 ? "s" : ""}`,
                                            timestamp: new Date().toISOString()
                                        },
                                    ],
                                };
                            })
                        );
                    },
                    onToken: (token) => {
                        accumulatedContent += token;
                        const snapshot = accumulatedContent;
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === streamingId
                                    ? { ...m, content: snapshot, isStreaming: true }
                                    : m
                            )
                        );
                    },
                    onCitation: (citation) => {
                        citations.push(citation);
                    },
                    onDone: (data) => {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === streamingId
                                    ? {
                                        ...m,
                                        id: data.message_id || streamingId,
                                        content: accumulatedContent,
                                        isStreaming: false,
                                        sources: citations.length > 0 ? citations : undefined,
                                        statusText:
                                            citations.length > 0
                                                ? "Retrieved from documents"
                                                : undefined,
                                    }
                                    : m
                            )
                        );
                        // Refresh sidebar after new message
                        window.dispatchEvent(new Event("navigator_conversation_created"));

                        if (isNewConversation && convId) {
                            const title = text.trim().slice(0, 60);
                            updateConversation(convId, { title }, token).then(() => {
                                window.dispatchEvent(new Event("navigator_conversation_created"));
                            }).catch(err => {
                                console.error("Failed to update conversation title:", err);
                            });
                        }
                    },
                    onError: (errMsg) => {
                        toast.error(errMsg || "Failed to get a response.");
                        setMessages((prev) => prev.filter((m) => m.id !== streamingId));
                    },
                },
                controller.signal
            );
        } catch (error: any) {
            if (error.name === "AbortError") {
                // User cancelled — finalize partial message
                setMessages((prev) =>
                    prev.map((m) => (m.id === streamingId ? { ...m, isStreaming: false } : m))
                );
                return;
            }
            console.error("Chat error:", error);

            // Provide detailed error feedback
            const errorMsg = error.message || "Failed to get a response. Please try again.";
            toast.error(errorMsg);

            // Replace streaming message with error notification
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === streamingId
                        ? {
                            ...m,
                            content: `Error: ${errorMsg}`,
                            isStreaming: false,
                        }
                        : m
                )
            );
        } finally {
            setIsResponding(false);
            abortControllerRef.current = null;
        }
    };

    // ── Stop streaming ────────────────────────────────────────────────────────

    const handleStop = () => {
        abortControllerRef.current?.abort();
        setIsResponding(false);
        // Finalise partial streaming message
        setMessages((prev) =>
            prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
        );
    };

    // ── Retry ─────────────────────────────────────────────────────────────────

    const handleRetry = async () => {
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
        if (!lastUser || !lastAssistant) return;

        // Remove last assistant message and re-send
        setMessages((prev) => prev.filter((m) => m.id !== lastAssistant.id));
        await handleSendMessage(lastUser.content);
    };

    // ── Copy ──────────────────────────────────────────────────────────────────

    const handleCopy = (content: string) => {
        navigator.clipboard
            .writeText(content)
            .then(() => toast.success("Copied to clipboard"))
            .catch(() => toast.error("Failed to copy"));
    };

    // ── Derived ───────────────────────────────────────────────────────────────

    const showEmptyState = !id && messages.length === 0 && !isLoadingMessages;

    const suggestions = [
        { text: "Summarize the Spanish communication pilot program's feedback." },
        { text: "Evaluate new policy changes in California and their impact on our operations." },
        { text: "Identify grants that we can apply for to fund our organic nutrition programs." },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            className="flex flex-col h-full overflow-hidden bg-[#FEFFFA] dark:bg-zinc-950"
            data-testid="new-chat-page"
            data-tour="chat-page"
        >


            {/* ── Scrollable Messages Area ──────────────────────────────── */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto hover-scrollbar"
            >
                {showEmptyState ? (
                    /* ── Empty / Welcome State ────────────────────────── */
                    <div className="flex flex-col items-center justify-center min-h-full text-center px-4 py-8 max-w-3xl mx-auto">
                        {/* Logo */}
                        <div className="mb-6 select-none pointer-events-none">
                            <img 
                                src="/logo.svg" 
                                alt="Logo" 
                                className="h-12 w-12 mx-auto dark:brightness-110" 
                            />
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-[34px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-8">
                            {greeting} {displayName}
                        </h1>

                        {/* Centered Input Box */}
                        <div className="w-full max-w-2xl mb-10">
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-md focus-within:shadow-lg focus-within:border-zinc-300 dark:focus-within:border-zinc-700 transition-all p-2 pl-5 pr-2 flex items-center gap-2">
                                <textarea
                                    value={inputVal}
                                    onChange={(e) => {
                                        setInputVal(e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            if (inputVal.trim() && !isResponding) handleSendMessage(inputVal);
                                        }
                                    }}
                                    placeholder="What do you want to do?"
                                    rows={1}
                                    className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 resize-none min-h-[24px] max-h-[80px] leading-relaxed py-1.5"
                                />

                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Model selector */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200/70 dark:border-zinc-700/50 cursor-pointer select-none">
                                                <Cpu className="h-3.5 w-3.5 text-zinc-400" />
                                                <span>{selectedModel}</span>
                                                <ChevronDown className="h-2.5 w-2.5 text-zinc-400" />
                                            </div>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                            <DropdownMenuItem onClick={() => setSelectedModel("Auto")}>Auto</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setSelectedModel("GPT-4o")}>GPT-4o</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setSelectedModel("Claude-3.5")}>Claude-3.5</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Send button */}
                                    <button
                                        type="button"
                                        onClick={() => handleSendMessage(inputVal)}
                                        disabled={!inputVal.trim()}
                                        className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <ArrowUp className="h-4 w-4 stroke-[2.5px]" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Suggestions Label */}
                        <div className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold tracking-wide mb-6 select-none">
                            Suggestions:
                        </div>

                        {/* Suggestions Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
                            {suggestions.map((s, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSendMessage(s.text)}
                                    className="relative flex flex-col items-start text-left bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/80 hover:border-blue-200 dark:hover:border-blue-800/60 hover:bg-blue-50/10 dark:hover:bg-blue-950/10 rounded-2xl p-5 cursor-pointer transition-all hover:scale-[1.01] shadow-sm group min-h-[140px]"
                                >


                                    {/* Card Icon */}
                                    <FileText className="h-5 w-5 text-zinc-400 dark:text-zinc-500 mb-3 shrink-0" />

                                    {/* Card Text */}
                                    <p className="text-[12px] font-medium leading-relaxed text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-colors">
                                        {s.text}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : isLoadingMessages ? (
                    /* ── Loading Skeleton ─────────────────────────────── */
                    <div className="max-w-2xl mx-auto px-4 pt-6 pb-6 space-y-8">
                        {[1, 2, 3].map((i) => {
                            const isUser = i % 2 === 0;
                            return (
                                <div key={i} className={`flex gap-3 items-start ${isUser ? "justify-end" : "justify-start"}`}>
                                    {!isUser && (
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 animate-pulse shrink-0 mt-1" />
                                    )}
                                    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"} max-w-[75%]`}>
                                        <div className={`h-10 w-56 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse`} />
                                        <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* ── Messages Thread ──────────────────────────────── */
                    <div className="max-w-2xl mx-auto px-4 pt-6 pb-6">
                        <div className="space-y-8">
                            {messages.map((m) => {
                                const timeStr = m.timestamp.toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                });

                                return (
                                    <div
                                        key={m.id}
                                        className="flex flex-col w-full animate-[messageIn_0.25s_ease-out]"
                                    >
                                        {m.role === "user" ? (
                                            /* User bubble */
                                            <div className="flex w-full justify-end">
                                                <div className="flex flex-col items-end gap-1.5 max-w-[75%]">
                                                    <div className="rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/30 dark:border-zinc-700/30">
                                                        <div className="whitespace-pre-wrap">{m.content}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3 pr-1 text-zinc-400 dark:text-zinc-500 text-[11px] select-none">
                                                        <span>{timeStr}</span>
                                                        <button
                                                            className="hover:text-zinc-600 transition-colors"
                                                            onClick={() => handleCopy(m.content)}
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Assistant bubble */
                                            <div className="flex w-full justify-start gap-3">
                                                {/* Avatar */}
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shrink-0 flex items-center justify-center mt-1">
                                                    <Cpu className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="flex flex-col items-start gap-2 max-w-[75%]">
                                                    {/* Thinking step accordion - with distinct styling */}
                                                    {m.thinkingSteps && m.thinkingSteps.length > 0 && (
                                                        <div className="w-full mb-2">
                                                            <ThinkingAccordion
                                                                isStreaming={m.isStreaming ?? false}
                                                                thinkingSteps={m.thinkingSteps}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Thinking step label fallback — while streaming and no steps array yet */}
                                                    {m.isStreaming && (!m.thinkingSteps || m.thinkingSteps.length === 0) && (
                                                        <div className="w-full mb-2 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                                                            <TypingDots />
                                                            <span>{thinkingLabel}</span>
                                                        </div>
                                                    )}

                                                    {/* Message content with distinct background */}
                                                    {(m.content || m.isStreaming) && (
                                                        <div className="w-full text-zinc-800 dark:text-zinc-200 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                                                            <MessageContent
                                                                content={m.content}
                                                                citations={m.sources}
                                                                isStreaming={m.isStreaming}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Action buttons */}
                                                    {!m.isStreaming && m.content && (
                                                        <div className="flex items-center gap-3 px-0 text-zinc-400 dark:text-zinc-500 text-xs select-none flex-wrap mt-1">
                                                            <span className="text-[11px]">{timeStr}</span>
                                                            <TooltipProvider delayDuration={200}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            className="flex items-center gap-1 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                                                            onClick={() => handleCopy(m.content)}
                                                                        >
                                                                            <Copy className="h-3.5 w-3.5" /> Copy
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top">Copy to clipboard</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            className="flex items-center gap-1 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                                                            onClick={handleRetry}
                                                                        >
                                                                            <RotateCcw className="h-3.5 w-3.5" /> Retry
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top">Regenerate response</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button 
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(m.content);
                                                                                toast.success("Message copied to clipboard!");
                                                                            }}
                                                                            className="flex items-center gap-1 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                                                        >
                                                                            <Share2 className="h-3.5 w-3.5" /> Share
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top">Share message</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>

                                                            {/* Citations list footer */}
                                                            {m.sources && m.sources.length > 0 && (
                                                                <div className="flex items-center gap-1.5 ml-1 border-l border-zinc-200 dark:border-zinc-700 pl-3 flex-wrap">
                                                                    {m.sources.map((src, sIdx) => (
                                                                        <div
                                                                            key={sIdx}
                                                                            className="flex items-center gap-1 px-2 py-0.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] text-zinc-500 dark:text-zinc-400 font-medium"
                                                                        >
                                                                            <FileText className="h-3 w-3 text-zinc-400 shrink-0" />
                                                                            <span className="max-w-[120px] truncate">{src.filename}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div ref={messagesEndRef} className="h-32" />
                    </div>
                )}
            </div>

            {/* ── Fixed Bottom Input Bar ────────────────────────────────── */}
            {!showEmptyState && (
                <div className="shrink-0 px-4 pb-4 pt-2 bg-[#FEFFFA] dark:bg-zinc-950">
                    <div
                        data-tour="chat-input"
                        className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm focus-within:shadow-md focus-within:border-zinc-300 dark:focus-within:border-zinc-700 transition-all p-3 flex flex-col gap-2"
                    >
                        <textarea
                            ref={textareaRef}
                            value={inputVal}
                            onChange={(e) => {
                                setInputVal(e.target.value);
                                resizeTextarea();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    if (inputVal.trim() && !isResponding) handleSendMessage(inputVal);
                                }
                            }}
                            placeholder={isResponding ? "Agent is responding..." : "Message agent... (Shift+Enter for new line)"}
                            rows={1}
                            disabled={isResponding}
                            className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 resize-none min-h-[28px] max-h-[200px] leading-relaxed disabled:opacity-60"
                        />

                        {/* Bottom row: model selector + attach + send */}
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                {/* Model selector */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors border border-zinc-200/70 dark:border-zinc-700/50 cursor-pointer select-none">
                                            <Cpu className="h-3 w-3 text-zinc-400" />
                                            <span>{selectedModel}</span>
                                            <ChevronDown className="h-2.5 w-2.5 text-zinc-400" />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-36 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                        <DropdownMenuItem onClick={() => setSelectedModel("Auto")}>Auto</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSelectedModel("GPT-4o")}>GPT-4o</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setSelectedModel("Claude-3.5")}>Claude-3.5</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                            </div>

                            {/* Send / Stop button */}
                            {isResponding ? (
                                <button
                                    type="button"
                                    onClick={handleStop}
                                    className="flex items-center justify-center h-8 w-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-all shadow-sm cursor-pointer"
                                    aria-label="Stop response"
                                >
                                    <Square className="h-3 w-3 fill-current" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleSendMessage(inputVal)}
                                    disabled={!inputVal.trim()}
                                    className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    aria-label="Send message"
                                >
                                    <ArrowUp className="h-4 w-4 stroke-[2.5px]" />
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 select-none">
                        Navigator may make mistakes. Verify important information.
                    </p>
                </div>
            )}
        </div>
    );
}
