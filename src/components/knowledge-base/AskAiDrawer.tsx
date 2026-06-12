import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, X, FileText } from "lucide-react";
import { safeOpen } from "@/utils/safeUrl";
import {
    Sheet,
    SheetContent,
    SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendChatQueryStream, type Citation, type ThinkingStep } from "@/lib/api";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { toast } from "sonner";

// ── Drawer Thinking Accordion ─────────────────────────────────────────────────
function DrawerThinkingAccordion({ isStreaming, thinkingSteps }: { isStreaming: boolean; thinkingSteps: ThinkingStep[] }) {
    const [isExpanded, setIsExpanded] = useState(isStreaming);

    useEffect(() => { if (isStreaming) setIsExpanded(true); }, [isStreaming]);

    if (!thinkingSteps || thinkingSteps.length === 0) return null;

    const lastStep = thinkingSteps[thinkingSteps.length - 1];
    const headerText = isStreaming
        ? (lastStep?.message || "Thinking...")
        : "Finished thinking";

    return (
        <div className="w-full mb-1.5 bg-surface-sidebar dark:bg-surface-sidebar rounded-lg overflow-hidden">
            <div
                onClick={() => setIsExpanded(v => !v)}
                className="flex items-center justify-between cursor-pointer px-2.5 py-1.5"
            >
                <div className="flex items-center gap-1.5">
                    <span className={`h-1 w-1 rounded-full shrink-0 ${isStreaming ? "bg-blue-500" : "bg-green-600"}`} />
                    <span className={`text-[10px] font-medium ${isStreaming ? "text-zinc-600 dark:text-zinc-400" : "text-green-700 dark:text-green-400"}`}>
                        {headerText}
                    </span>
                </div>
            </div>
            {isExpanded && (
                <div className="space-y-0.5 text-[9px] text-zinc-600 dark:text-zinc-400 px-2.5 py-1.5 max-h-28 overflow-y-auto border-t border-zinc-200 dark:border-zinc-700">
                    {thinkingSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                            <div className="h-1 w-1 rounded-full bg-zinc-400 shrink-0" />
                            <span className="leading-tight">{step.message}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: Citation[];
    isStreaming?: boolean;
    thinkingSteps?: ThinkingStep[];
};

type AskAiDrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    folderId?: string;
};

export default function AskAiDrawer({ open, onOpenChange, folderId }: AskAiDrawerProps) {
    const { getToken } = useKindeAuth();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hi there! How can I help you today?",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [_thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Reset conversation when drawer closes
    useEffect(() => {
        if (!open) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            setMessages([
                {
                    id: "1",
                    role: "assistant",
                    content: "Hi there! How can I help you today?",
                },
            ]);
            setConversationId(null);
            setInput("");
            setIsLoading(false);
            setThinkingSteps([]);
        }
    }, [open]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const text = input.trim();
        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text,
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);
        setThinkingSteps([]);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const streamingId = "streaming-" + Date.now();
        const initialAssistantMsg: Message = {
            id: streamingId,
            role: "assistant",
            content: "",
            isStreaming: true,
            thinkingSteps: [],
        };
        setMessages((prev) => [...prev, initialAssistantMsg]);

        try {
            const token = await getToken();
            if (!token) throw new Error("Not authenticated");

            let accumulatedContent = "";
            const citations: Citation[] = [];

            await sendChatQueryStream(
                {
                    query: text,
                    conversation_id: conversationId ?? undefined,
                    folder_id: folderId ?? undefined,
                },
                token,
                {
                    onThinking: (step, message) => {
                        setThinkingSteps(prev => {
                            const last = prev[prev.length - 1];
                            if (last && last.message === message) return prev; // deduplicate
                            return [...prev, { step, message, timestamp: new Date().toISOString() }];
                        });
                        setMessages(prev =>
                            prev.map(m =>
                                m.id === streamingId
                                    ? {
                                        ...m,
                                        thinkingSteps: (() => {
                                            const existing = m.thinkingSteps || [];
                                            const last = existing[existing.length - 1];
                                            if (last && last.message === message) return existing;
                                            return [...existing, { step, message, timestamp: new Date().toISOString() }];
                                        })(),
                                    }
                                    : m
                            )
                        );
                    },
                    onToolCall: (toolName, query) => {
                        const label = toolName === "search_knowledge_base"
                            ? `Searching knowledge base for: "${query.slice(0, 50)}${query.length > 50 ? "..." : ""}"`
                            : toolName === "search_web"
                                ? `Searching the web for: "${query.slice(0, 50)}${query.length > 50 ? "..." : ""}"`
                                : `Calling ${toolName}`;
                        setThinkingSteps(prev => [...prev, { step: "tool_call", message: label, timestamp: new Date().toISOString() }]);
                        setMessages(prev =>
                            prev.map(m =>
                                m.id === streamingId
                                    ? { ...m, thinkingSteps: [...(m.thinkingSteps || []), { step: "tool_call", message: label, timestamp: new Date().toISOString() }] }
                                    : m
                            )
                        );
                    },
                    onToolResult: (_toolName, resultCount) => {
                        const label = `Found ${resultCount} result${resultCount !== 1 ? "s" : ""}`;
                        setThinkingSteps(prev => [...prev, { step: "tool_result", message: label, timestamp: new Date().toISOString() }]);
                        setMessages(prev =>
                            prev.map(m =>
                                m.id === streamingId
                                    ? { ...m, thinkingSteps: [...(m.thinkingSteps || []), { step: "tool_result", message: label, timestamp: new Date().toISOString() }] }
                                    : m
                            )
                        );
                    },
                    onToken: (token) => {
                        accumulatedContent += token;
                        const snapshot = accumulatedContent;
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === streamingId
                                    ? { ...m, content: snapshot }
                                    : m
                            )
                        );
                    },
                    onCitation: (citation) => {
                        citations.push(citation);
                    },
                    onDone: (data) => {
                        if (import.meta.env.DEV) console.log(`[Token Usage] Total tokens used for response: ${data.tokens_used ?? "unknown"}`);
                        if (!conversationId) {
                            setConversationId(data.conversation_id);
                        }
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === streamingId
                                    ? {
                                        ...m,
                                        id: data.message_id || streamingId,
                                        content: accumulatedContent,
                                        isStreaming: false,
                                        citations: citations.length > 0 ? citations : undefined,
                                    }
                                    : m
                            )
                        );
                        setIsLoading(false);
                        abortControllerRef.current = null;
                    },
                    onError: (err) => {
                        throw new Error(err);
                    },
                },
                controller.signal
            );
        } catch (error: any) {
            if (error.name === "AbortError") return;

            console.error("AI Error:", error);

            // Remove the streaming placeholder message
            setMessages((prev) => prev.filter((m) => m.id !== streamingId));

            const errMsg: Message = {
                id: "err-" + Date.now(),
                role: "assistant",
                content:
                    error.message?.includes("404") || error.message?.includes("No folder")
                        ? "I couldn't find any relevant documents in this knowledge base. Please make sure documents have been uploaded and processed."
                        : "Sorry, I encountered an error while searching your knowledge base. Please try again.",
            };
            setMessages((prev) => [...prev, errMsg]);
            if (!error.message?.includes("404")) {
                toast.error(error.message || "Failed to get AI response");
            }
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" hideClose className="sm:max-w-[520px] p-0 flex flex-col h-full border-l border-slate-200 bg-white">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(false)}
                        className="rounded-lg h-7 w-7 hover:bg-slate-100 text-slate-500 transition-colors -ml-1"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                            <SheetTitle className="text-sm font-semibold text-slate-900">Navigator AI</SheetTitle>
                            <p className="text-xs text-slate-500 font-normal">
                                {folderId ? "Folder Search" : "Knowledge Base"}
                            </p>
                        </div>
                    </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar bg-white">
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={cn(
                                "flex gap-3 animate-in fade-in-50 duration-300",
                                m.role === "user" ? "flex-row-reverse justify-end" : "flex-row justify-start"
                            )}
                        >
                            {/* Avatar */}
                            <div className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold mt-0.5",
                                m.role === "assistant"
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-300 text-slate-700"
                            )}>
                                {m.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                            </div>

                            {/* Message Container */}
                            <div className={cn(
                                "flex flex-col gap-2 flex-1",
                                m.role === "user" ? "items-end max-w-xs" : "items-start max-w-sm"
                            )}>
                                {/* Thinking Accordion */}
                                {m.role === "assistant" && m.thinkingSteps && m.thinkingSteps.length > 0 && (
                                    <DrawerThinkingAccordion
                                        isStreaming={m.isStreaming ?? false}
                                        thinkingSteps={m.thinkingSteps}
                                    />
                                )}

                                {/* Fallback thinking indicator while streaming with no steps yet */}
                                {m.isStreaming && !m.content && (!m.thinkingSteps || m.thinkingSteps.length === 0) && (
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium",
                                        "bg-slate-100 text-slate-600"
                                    )}>
                                        <div className="flex gap-1 items-center shrink-0">
                                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
                                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                        <span>Thinking...</span>
                                    </div>
                                )}

                                {/* Message Bubble */}
                                {(m.content || (m.isStreaming && (!m.thinkingSteps || m.thinkingSteps.length === 0))) && (
                                    <div className={cn(
                                        "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                                        m.role === "user"
                                            ? "bg-blue-600 text-white rounded-br-md"
                                            : "bg-slate-100 text-slate-900 rounded-bl-md"
                                    )}>
                                        {m.content ? (
                                            <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed font-normal">
                                                {m.content}
                                            </div>
                                        ) : (
                                            <div className="flex gap-1.5 items-center py-0.5">
                                                <span className={cn(
                                                    "h-1.5 w-1.5 rounded-full animate-bounce",
                                                    m.role === "user" ? "bg-white/60" : "bg-slate-400"
                                                )} />
                                                <span className={cn(
                                                    "h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:0.2s]",
                                                    m.role === "user" ? "bg-white/60" : "bg-slate-400"
                                                )} />
                                                <span className={cn(
                                                    "h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:0.4s]",
                                                    m.role === "user" ? "bg-white/60" : "bg-slate-400"
                                                )} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Citations */}
                                {m.citations && m.citations.length > 0 && (
                                    <div className={cn(
                                        "flex flex-wrap gap-2 mt-1 w-full",
                                        m.role === "user" ? "justify-end" : "justify-start"
                                    )}>
                                        {m.citations.map((c, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    if (c.file_id) {
                                                        toast.info(`Document: ${c.filename}\nRelevance: ${Math.round((c.relevance_score || 0) * 100)}%`);
                                                        // TODO: Open file preview or navigate to file
                                                    } else if (c.heading_path) {
                                                        safeOpen(c.heading_path);
                                                    }
                                                }}
                                                className="group flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-md text-[10px] font-medium text-slate-700 transition-colors cursor-pointer"
                                                title={c.content_preview}
                                            >
                                                <FileText className="h-2.5 w-2.5 shrink-0 text-slate-600" />
                                                <span className="truncate max-w-[90px]">{c.filename}</span>
                                                {c.relevance_score !== undefined && c.relevance_score > 0 && (
                                                    <span className="text-slate-500 ml-0.5 font-semibold">
                                                        {Math.round(c.relevance_score * 100)}%
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Empty state message */}
                    {messages.length === 1 && (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                                <Sparkles className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900 text-sm">Ask Navigator AI</p>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-[80%] mx-auto">
                                    Search through your documents and get instant answers powered by AI
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="border-t border-slate-200 bg-white px-4 py-3">
                    <div className="relative flex items-end gap-2">
                        <textarea
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Ask a question..."
                            className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-base md:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all max-h-24"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            size="sm"
                            className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all flex-shrink-0"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 text-center font-normal">
                        Shift + Enter for new line
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
