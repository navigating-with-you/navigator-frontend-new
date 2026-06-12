import {
    useState,
    useEffect,
    useRef,
    useCallback,
    type JSX,
} from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { useUserProfile } from "@/contexts/UserContext";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowUp,
    FileText,
    ChevronDown,
    Copy,
    RotateCcw,
    Square,
    Cpu,
    Search,
    BarChart2,
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
import { ThinkingAccordion, THINKING_STEP_LABELS } from "@/components/chat/ThinkingAccordion";
import { SourcesPill } from "@/components/chat/SourcesPill";
import { MessageContent } from "@/components/chat/MessageContent";
import { safeOpen } from "@/utils/safeUrl";

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


// ── Main Component ────────────────────────────────────────────────────────────

export default function NewChatPage(): JSX.Element {
    const { user, isLoading: authLoading, getToken } = useKindeAuth();
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();

    const { userProfile: profile } = useUserProfile();
    const [inputVal, setInputVal] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isResponding, setIsResponding] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [greeting] = useState(() => {
        const h = new Date().getHours();
        return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
    });
    const [selectedModel, setSelectedModel] = useState("Default");
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

    // Track active conversation ID in a ref to discard stale streaming callbacks
    const currentConversationIdRef = useRef<string | null>(conversationId);
    useEffect(() => {
        currentConversationIdRef.current = conversationId;
    }, [conversationId]);

    // Abort controller clean up on unmount
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    // ── URL / route effects ───────────────────────────────────────────────────

    useEffect(() => {
        if (authLoading) return;
        if (id) {
            if (id !== conversationId) {
                // Abort any ongoing streaming query for the old conversation
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                    abortControllerRef.current = null;
                }
                setIsResponding(false);

                if (isCreatingConversationRef.current) {
                    setConversationId(id);
                    isCreatingConversationRef.current = false;
                } else {
                    loadConversationById(id);
                }
            }
        } else {
            // Abort any ongoing streaming query
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            setIsResponding(false);
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

    useEffect(() => {
        const handleCreated = async () => {
            if (conversationId && !isResponding) {
                try {
                    const token = await getToken();
                    if (!token) return;
                    // const conv = await getConversation(conversationId, token);
                } catch (e) {
                    console.error("Failed to sync conversation title", e);
                }
            }
        };
        window.addEventListener("navigator_conversation_created", handleCreated);
        return () => window.removeEventListener("navigator_conversation_created", handleCreated);
    }, [conversationId, isResponding, getToken]);

    // ── Profile / greeting ────────────────────────────────────────────────────

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

    // ── Handle citation click ─────────────────────────────────────────────────

    const handleCitationClick = useCallback((citation: Citation) => {
        if (citation.file_id) {
            // Internal document - open file preview or navigate to knowledge base
            toast.success(`Opening: ${citation.filename}`);
            // TODO: Navigate to file viewer or open preview modal
            // Example: openFilePreview(citation.file_id)
        } else {
            // Web source - open in new tab
            if (citation.heading_path) {
                safeOpen(citation.heading_path);
            }
        }
    }, []);

    // ── Send message ──────────────────────────────────────────────────────────

    const handleSendMessage = async (text: string, truncateMessageId?: string) => {
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

        let convId = conversationId;

        try {
            const token = await getToken();

            if (!token) {
                // Dev mock fallback
                setTimeout(() => {
                    setMessages((prev) => {
                        if (!prev.some((m) => m.id === streamingId)) return prev;
                        return prev.map((m) =>
                            m.id === streamingId
                                ? { ...m, content: `I've received: "${text}". (Dev mode — no auth token)`, isStreaming: false }
                                : m
                        );
                    });
                    setIsResponding(false);
                }, 1200);
                return;
            }

            const isNewConversation = !convId;

            if (!convId) {
                isCreatingConversationRef.current = true;
                try {
                    const conv: Conversation = await createConversation("Untitled", token);
                    if (currentConversationIdRef.current !== null) {
                        // User navigated away to a different chat while we were creating this new one
                        return;
                    }
                    convId = conv.id;
                    setConversationId(conv.id);
                    currentConversationIdRef.current = conv.id;
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
                    model: undefined,
                    truncate_message_id: truncateMessageId,
                },
                token,
                {
                    onThinking: (step, message) => {
                        if (convId !== currentConversationIdRef.current) return;
                        const label = THINKING_STEP_LABELS[step] ?? message ?? "Thinking...";
                        setThinkingLabel(label);
                        setMessages((prev) => {
                            if (!prev.some((m) => m.id === streamingId)) return prev;
                            return prev.map((m) => {
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
                            });
                        });
                    },
                    onToolCall: (toolName, query) => {
                        if (convId !== currentConversationIdRef.current) return;
                        const toolLabel = toolName === "search_knowledge_base"
                            ? "Searching knowledge base"
                            : toolName === "search_web"
                                ? "Searching the web"
                                : `Calling ${toolName}`;

                        setMessages((prev) => {
                            if (!prev.some((m) => m.id === streamingId)) return prev;
                            return prev.map((m) => {
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
                            });
                        });
                    },
                    onToolResult: (toolName, resultCount) => {
                        if (convId !== currentConversationIdRef.current) return;
                        const toolLabel = toolName === "search_knowledge_base"
                            ? "Knowledge base search"
                            : toolName === "search_web"
                                ? "Web search"
                                : toolName;

                        setMessages((prev) => {
                            if (!prev.some((m) => m.id === streamingId)) return prev;
                            return prev.map((m) => {
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
                            });
                        });
                    },
                    onToken: (token) => {
                        if (convId !== currentConversationIdRef.current) return;
                        accumulatedContent += token;
                        const snapshot = accumulatedContent;
                        setMessages((prev) => {
                            if (!prev.some((m) => m.id === streamingId)) return prev;
                            return prev.map((m) =>
                                m.id === streamingId
                                    ? { ...m, content: snapshot, isStreaming: true }
                                    : m
                            );
                        });
                    },
                    onCitation: (citation) => {
                        if (convId !== currentConversationIdRef.current) return;
                        citations.push(citation);
                    },
                    onDone: (data) => {
                        if (import.meta.env.DEV) console.log(`[Token Usage] Total tokens used for response: ${data.tokens_used ?? "unknown"}`);
                        if (convId !== currentConversationIdRef.current) return;
                        setMessages((prev) => {
                            if (!prev.some((m) => m.id === streamingId)) return prev;
                            return prev.map((m) =>
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
                            );
                        });
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
                    onError: (_errMsg) => {
                        if (convId !== currentConversationIdRef.current) return;
                        toast.error("Something went wrong. Please try again.");
                        setMessages((prev) => {
                            if (!prev.some((m) => m.id === streamingId)) return prev;
                            return prev.map((m) =>
                                m.id === streamingId
                                    ? {
                                        ...m,
                                        content: "Something went wrong. Please try again.",
                                        isStreaming: false,
                                    }
                                    : m
                            );
                        });
                    },
                },
                controller.signal
            );
        } catch (error: any) {
            if (convId !== currentConversationIdRef.current) return;
            if (error.name === "AbortError") {
                // User cancelled — finalize partial message
                setMessages((prev) => {
                    if (!prev.some((m) => m.id === streamingId)) return prev;
                    return prev.map((m) => (m.id === streamingId ? { ...m, isStreaming: false } : m));
                });
                return;
            }
            console.error("Chat error:", error);

            // Provide detailed error feedback
            toast.error("Something went wrong. Please try again.");

            // Replace streaming message with error notification
            setMessages((prev) => {
                if (!prev.some((m) => m.id === streamingId)) return prev;
                return prev.map((m) =>
                    m.id === streamingId
                        ? {
                            ...m,
                            content: "Something went wrong. Please try again.",
                            isStreaming: false,
                        }
                        : m
                );
            });
        } finally {
            if (convId === currentConversationIdRef.current) {
                setIsResponding(false);
                abortControllerRef.current = null;
            }
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

    const handleRetry = async (messageToRetry: Message) => {
        if (isResponding) return;

        // 1. Find the index of the assistant message to retry
        const assistantIdx = messages.findIndex((m) => m.id === messageToRetry.id);
        if (assistantIdx === -1) return;

        // 2. Find the preceding user message
        let userMsgIdx = -1;
        for (let i = assistantIdx - 1; i >= 0; i--) {
            if (messages[i].role === "user") {
                userMsgIdx = i;
                break;
            }
        }
        if (userMsgIdx === -1) return;

        const userMsg = messages[userMsgIdx];

        // 3. Determine if we have a valid database UUID for the assistant message
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageToRetry.id);
        const truncateId = isValidUuid ? messageToRetry.id : undefined;

        // 4. Update local state: clear the user message and all messages below it
        // We update the state here immediately preceding handleSendMessage.
        // Because handleSendMessage uses setMessages((prev) => ...), React batches these two updates
        // together, so the user never sees a blank intermediate screen!
        const messagesToKeep = messages.slice(0, userMsgIdx);
        setMessages(messagesToKeep);

        // 5. Resend the prompt with on-the-fly backend truncation
        await handleSendMessage(userMsg.content, truncateId);
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
        { text: "Summarize the Spanish communication pilot program's feedback.", icon: FileText },
        { text: "Evaluate new policy changes in California and their impact on our operations.", icon: BarChart2 },
        { text: "Identify grants that we can apply for to fund our organic nutrition programs.", icon: Search },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            className="flex flex-col h-full overflow-hidden bg-surface-page dark:bg-zinc-950"
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
                    <div className="flex flex-col items-center justify-center min-h-full text-center px-3 sm:px-6 py-6 md:py-10 max-w-5xl mx-auto">
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
                        <div className="w-full max-w-4xl mb-6 md:mb-10">
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-full shadow-md focus-within:shadow-lg focus-within:border-zinc-300 dark:focus-within:border-zinc-700 transition-all p-2.5 sm:p-2 pl-4 sm:pl-5 pr-2.5 sm:pr-2 flex flex-col sm:flex-row sm:items-center gap-2">
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
                                    className="w-full sm:flex-1 bg-transparent border-none outline-none focus:ring-0 text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 resize-none min-h-[24px] max-h-[80px] leading-relaxed py-1.5"
                                />

                                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t border-zinc-100 dark:border-zinc-800 sm:border-none">
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
                                            <DropdownMenuItem onClick={() => setSelectedModel("Default")}>Default</DropdownMenuItem>
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
                        <div className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold tracking-wide mb-4 md:mb-6 select-none">
                            Suggestions:
                        </div>

                        {/* Suggestions Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 w-full max-w-5xl">
                            {suggestions.map((s, idx) => {
                                const Icon = s.icon;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSendMessage(s.text)}
                                        className="relative flex flex-col items-start text-left bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/80 hover:border-blue-200 dark:hover:border-blue-800/60 hover:bg-blue-50/10 dark:hover:bg-blue-950/10 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all hover:scale-[1.01] shadow-sm group"
                                    >
                                        <Icon className="h-5 w-5 text-zinc-400 dark:text-zinc-500 mb-3 shrink-0" />
                                        <p className="text-[12px] font-medium leading-relaxed text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-colors">
                                            {s.text}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : isLoadingMessages ? (
                    /* ── Loading Skeleton ─────────────────────────────── */
                    <div className="max-w-4xl mx-auto px-3 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-6 space-y-6 md:space-y-8">
                        {[1, 2, 3].map((i) => {
                            const isUser = i % 2 === 0;
                            return (
                                <div key={i} className={`flex gap-3 items-start ${isUser ? "justify-end" : "justify-start"}`}>
                                    {!isUser && (
                                        <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse shrink-0 mt-1" />
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
                    <div className="max-w-4xl mx-auto px-3 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-6">
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
                                                    <div className="rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/30 dark:border-zinc-700/30 select-text">
                                                        <div className="whitespace-pre-wrap">{m.content}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3 pr-1 text-zinc-400 dark:text-zinc-500 text-[11px] select-none">
                                                        <span>{timeStr}</span>
                                                        <button
                                                            className="hover:text-zinc-650 dark:hover:text-zinc-350 transition-colors cursor-pointer"
                                                            onClick={() => handleCopy(m.content)}
                                                            title="Copy message"
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Assistant bubble */
                                            <div className="flex w-full justify-start overflow-hidden">
                                                <div className="flex flex-col items-start min-w-0 w-full gap-2.5">
                                                    {/* Thinking step accordion - with distinct styling */}
                                                    {m.thinkingSteps && m.thinkingSteps.length > 0 && (
                                                        <div className="w-full mb-1">
                                                            <ThinkingAccordion
                                                                isStreaming={m.isStreaming ?? false}
                                                                thinkingSteps={m.thinkingSteps}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Thinking step label fallback — while streaming and no steps array yet */}
                                                    {m.isStreaming && (!m.thinkingSteps || m.thinkingSteps.length === 0) && (
                                                        <div className="w-full max-w-[90%] sm:max-w-[75%] md:max-w-[60%] mb-1 flex items-center gap-2 px-3 py-2 bg-surface-sidebar dark:bg-surface-sidebar border border-surface-sidebar/50 dark:border-surface-sidebar/20 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 animate-pulse">
                                                            <span>{thinkingLabel}</span>
                                                        </div>
                                                    )}

                                                    {/* Message content - 60% max width, clean layout without bubble background */}
                                                    {(m.content || m.isStreaming) && (
                                                        <div className="w-full max-w-[90%] sm:max-w-[75%] md:max-w-[60%] text-zinc-800 dark:text-zinc-200 select-text">
                                                            <MessageContent
                                                                content={m.content}
                                                                citations={m.sources}
                                                                isStreaming={m.isStreaming}
                                                                onCitationClick={handleCitationClick}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Action buttons toolbar */}
                                                    {!m.isStreaming && m.content && (
                                                        <div className="flex items-center gap-5 text-zinc-450 dark:text-zinc-500 text-xs font-semibold select-none flex-wrap mt-3">
                                                            <TooltipProvider delayDuration={200}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            className="flex items-center gap-1.5 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                                                                            onClick={() => handleCopy(m.content)}
                                                                        >
                                                                            <Copy className="h-4 w-4" /> Copy
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top">Copy to clipboard</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            className="flex items-center gap-1.5 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                                                                            onClick={() => handleRetry(m)}
                                                                        >
                                                                            <RotateCcw className="h-4 w-4" /> Try Again
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top">Regenerate response</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>

                                                            {/* Sources stacked pill */}
                                                            {m.sources && m.sources.length > 0 && (
                                                                <SourcesPill sources={m.sources} onSourceClick={handleCitationClick} />
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Timestamp for assistant message */}
                                                    {!m.isStreaming && m.content && (
                                                        <div className="text-zinc-400 dark:text-zinc-500 text-[11px] select-none mt-2">
                                                            <span>{timeStr}</span>
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
                <div className="shrink-0 px-3 sm:px-6 pb-[calc(12px+env(safe-area-inset-bottom))] sm:pb-5 pt-2 bg-surface-page dark:bg-zinc-950">
                    <div
                        data-tour="chat-input"
                        className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm focus-within:shadow-md focus-within:border-zinc-300 dark:focus-within:border-zinc-700 transition-all p-2.5 sm:p-3.5 flex flex-col gap-1.5 sm:gap-2"
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
                            className="w-full bg-transparent border-none outline-none focus:ring-0 text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 resize-none min-h-[28px] max-h-[200px] leading-relaxed disabled:opacity-60"
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
                                        <DropdownMenuItem onClick={() => setSelectedModel("Default")}>Default</DropdownMenuItem>
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
