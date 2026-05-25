import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, X, FileText } from "lucide-react";
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendChatQueryStream, type Citation } from "@/lib/api";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { toast } from "sonner";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: Citation[];
    isStreaming?: boolean;
    thinkingLabel?: string;
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
            content: "Hello! I can search through your knowledge base and answer questions using AI. What would you like to know?",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
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
                    content: "Hello! I can search through your knowledge base and answer questions using AI. What would you like to know?",
                },
            ]);
            setConversationId(null);
            setInput("");
            setIsLoading(false);
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
            thinkingLabel: "Analyzing request...",
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
                        const stepLabels: Record<string, string> = {
                            understanding: "Analyzing request...",
                            planning: "Planning steps...",
                            decomposing: "Decomposing problem...",
                            searching: "Searching documents...",
                            evaluating: "Evaluating search results...",
                            reranking: "Reranking documents...",
                            refining: "Refining details...",
                            synthesizing: "Synthesizing answer...",
                            answering: "Formulating response...",
                        };
                        const label = stepLabels[step] ?? message ?? "Thinking...";
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === streamingId
                                    ? { ...m, thinkingLabel: label }
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
                                          thinkingLabel: undefined,
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
            <SheetContent side="right" className="sm:max-w-[480px] p-0 flex flex-col h-full border-l border-zinc-200">
                <SheetHeader className="p-6 border-b border-zinc-100 flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-semibold">Ask Navigator AI</SheetTitle>
                            <p className="text-xs text-zinc-500">
                                {folderId ? "Querying this folder's documents" : "Querying your Knowledge Base"}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full h-8 w-8">
                        <X className="h-4 w-4 text-zinc-500" />
                    </Button>
                </SheetHeader>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#FAFAFA]">
                    {messages.map((m) => (
                        <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm",
                                m.role === "assistant" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-white text-zinc-600 border-zinc-200"
                            )}>
                                {m.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                            </div>
                            <div className="flex flex-col gap-1.5 max-w-[85%]">
                                {/* Thinking Step Label */}
                                {m.isStreaming && !m.content && m.thinkingLabel && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 border border-zinc-200/40 rounded-xl text-[11px] text-zinc-500">
                                        <div className="flex gap-1 items-center shrink-0">
                                            <span className="h-1 w-1 rounded-full bg-zinc-400 animate-bounce" />
                                            <span className="h-1 w-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
                                            <span className="h-1 w-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                        <span>{m.thinkingLabel}</span>
                                    </div>
                                )}

                                {/* Message bubble */}
                                {(m.content || (m.isStreaming && !m.thinkingLabel)) && (
                                    <div className={cn(
                                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                                        m.role === "user" ? "bg-blue-600 text-white" : "bg-white text-zinc-900 border border-zinc-100"
                                    )}>
                                        {m.content ? (
                                            <div className="whitespace-pre-wrap">{m.content}</div>
                                        ) : (
                                            <div className="flex gap-1 items-center py-1">
                                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" />
                                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
                                                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Citations */}
                                {m.citations && m.citations.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 px-1 mt-1">
                                        {m.citations.map((c, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 rounded-md text-[10px] text-zinc-500 font-medium border border-zinc-200/60"
                                                title={c.content_preview}
                                            >
                                                <FileText className="h-3 w-3 shrink-0" />
                                                <span className="truncate max-w-[140px]">{c.filename}</span>
                                                {c.relevance_score !== undefined && c.relevance_score > 0 && (
                                                    <span className="text-zinc-400 ml-0.5">{Math.round(c.relevance_score * 100)}%</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-zinc-100 bg-white">
                    <div className="relative flex items-center">
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
                            placeholder="Type your question..."
                            className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all max-h-32"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            size="icon"
                            className="absolute right-2 h-8 w-8 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
                        >
                            <Send className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2 text-center">
                        Powered by RAG — responses are grounded in your uploaded documents
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
