import { apiClient } from "@/utils/apiClient";
import { config } from "../config";

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function syncUser(token: string) {
    return apiClient.post<any>("/auth/sync", undefined, { token });
}

// ── Employees ─────────────────────────────────────────────────────────────────

export async function listEmployees(token: string) {
    return apiClient.get<any>("/auth/employees", { token, cacheTTL: 300000 });
}

export async function deleteEmployee(employeeId: string, token: string) {
    return apiClient.delete<any>(`/auth/employees/${employeeId}`, undefined, { token });
}

// ── Invites ───────────────────────────────────────────────────────────────────

export async function createInvite(payload: {
    email: string;
    first_name: string;
    last_name: string | null;
    role_name: string;
}, token: string) {
    return apiClient.post<any>("/invite/", payload, { token });
}

export async function listInvites(token: string) {
    return apiClient.get<any>("/invite/", { token, cacheTTL: 300000 });
}

export async function resendInvite(inviteId: string, token: string) {
    return apiClient.post<any>(`/invite/${inviteId}/resend`, undefined, { token });
}

export async function revokeInvite(inviteId: string, token: string) {
    return apiClient.delete<any>(`/invite/${inviteId}/revoke`, undefined, { token });
}

// ── RBAC ──────────────────────────────────────────────────────────────────────

export async function listRoles(token: string) {
    return apiClient.get<any>("/rbac/roles", { token, cacheTTL: 3600000 });
}

// ── Folders ───────────────────────────────────────────────────────────────────

export async function listFolders(token: string) {
    return apiClient.get<any>("/folders/", { token, cacheTTL: 300000 });
}

export async function getRootContents(token: string) {
    return apiClient.get<any>("/api/root-folder/contents", { token, cacheTTL: 300000 });
}

export async function getFolderContents(folderId: string, token: string) {
    return apiClient.get<any>(`/api/root-folder/folders/${folderId}/contents`, { token, cacheTTL: 300000 });
}

export async function createFolder(payload: { name: string; description?: string; parent_folder_id?: string }, token: string) {
    if (payload.parent_folder_id) {
        return apiClient.post<any>(`/api/root-folder/folders/${payload.parent_folder_id}/subfolders`, {
            name: payload.name,
            description: payload.description
        }, { token });
    }
    return apiClient.post<any>("/api/root-folder/folders", {
        name: payload.name,
        description: payload.description
    }, { token });
}

export async function getFolder(folderId: string, token: string) {
    return apiClient.get<any>(`/folders/${folderId}`, { token, cacheTTL: 300000 });
}

export async function getFolderStats(folderId: string, token: string) {
    return apiClient.get<any>(`/folders/${folderId}/stats`, { token, cache: false });
}

export async function updateFolder(folderId: string, payload: { name?: string; description?: string }, token: string) {
    return apiClient.patch<any>(`/folders/${folderId}`, payload, { token });
}

export async function deleteFolder(folderId: string, token: string) {
    return apiClient.delete<any>(`/folders/${folderId}`, undefined, { token });
}

// ── Files ─────────────────────────────────────────────────────────────────────

export async function listFiles(folderId: string, token: string) {
    return apiClient.get<any>(`/files/folder/${folderId}/list`, { token, cacheTTL: 300000 });
}

export async function uploadFiles(folderId: string, files: File[], token: string) {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append("files", file);
    });
    return apiClient.post<any>(`/files/upload/${folderId}`, formData, { token });
}

export async function deleteFiles(fileIds: string[], token: string) {
    return apiClient.delete<any>("/files/", { file_ids: fileIds }, { token });
}

export async function getFile(fileId: string, token: string) {
    return apiClient.get<any>(`/files/${fileId}`, { token, cache: false });
}

export async function getFileDownloadUrl(fileId: string, token: string, expiration = 3600) {
    return apiClient.get<any>(`/files/${fileId}/download?expiration=${expiration}`, { token, cache: false });
}

export async function extractFileText(fileId: string, token: string) {
    return apiClient.post<any>(`/ocr/extract/${fileId}`, undefined, { token });
}

// ── OCR / Vector Search ───────────────────────────────────────────────────────

export async function vectorSearch(folderId: string, query: string, token: string, topK = 10) {
    return apiClient.post<any>(`/ocr/search/${folderId}`, { query, top_k: topK }, { token });
}

export async function getFileOcrJob(fileId: string, token: string) {
    return apiClient.get<any>(`/ocr/jobs/file/${fileId}`, { token, cache: false });
}

export async function listFolderOcrJobs(folderId: string, token: string, statusFilter?: string) {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return apiClient.get<any>(`/ocr/jobs/folder/${folderId}${qs}`, { token, cache: false });
}

export async function getOcrJob(jobId: string, token: string) {
    return apiClient.get<any>(`/ocr/jobs/${jobId}`, { token, cache: false });
}

export async function retryOcrJob(jobId: string, token: string) {
    return apiClient.post<any>(`/ocr/jobs/${jobId}/retry`, undefined, { token });
}

export async function getOcrStats(token: string) {
    return apiClient.get<any>("/ocr/stats", { token, cache: false });
}

export async function createOcrJob(payload: { file_id: string; extraction_type?: string }, token: string) {
    return apiClient.post<any>("/ocr/jobs", payload, { token });
}

// ── Groups / Categories ───────────────────────────────────────────────────────

export async function listGroups(token: string) {
    return apiClient.get<any>("/groups/", { token, cacheTTL: 300000 });
}

export async function createGroup(payload: { name: string; description?: string }, token: string) {
    return apiClient.post<any>("/groups/", payload, { token });
}

export async function getGroup(groupId: string, token: string) {
    return apiClient.get<any>(`/groups/${groupId}`, { token, cacheTTL: 300000 });
}

export async function updateGroup(groupId: string, payload: { name?: string; description?: string; is_archived?: boolean }, token: string) {
    return apiClient.patch<any>(`/groups/${groupId}`, payload, { token });
}

export async function deleteGroup(groupId: string, token: string) {
    return apiClient.delete<any>(`/groups/${groupId}`, undefined, { token });
}

export async function addGroupMembers(groupId: string, userIds: string[], token: string) {
    return apiClient.post<any>(`/groups/${groupId}/members`, { user_ids: userIds }, { token });
}

export async function removeGroupMembers(groupId: string, userIds: string[], token: string) {
    return apiClient.delete<any>(`/groups/${groupId}/members`, { user_ids: userIds }, { token });
}

export async function addGroupFiles(groupId: string, fileIds: string[], token: string) {
    return apiClient.post<any>(`/groups/${groupId}/files`, { file_ids: fileIds }, { token });
}

export async function removeGroupFiles(groupId: string, fileIds: string[], token: string) {
    return apiClient.delete<any>(`/groups/${groupId}/files`, { file_ids: fileIds }, { token });
}

// ── Chat / RAG ────────────────────────────────────────────────────────────────

export interface ChatQueryPayload {
    query: string;
    conversation_id?: string;
    folder_id?: string;
    max_iterations?: number;
}

/** A citation from the backend SSE stream */
export interface Citation {
    file_id?: string;
    filename: string;
    chunk_id?: number;
    heading_path?: string;
    relevance_score?: number;
    content_preview?: string;
}

export interface ThinkingStep {
    step: string;
    message: string;
    timestamp: string;
    duration_ms?: number;
}

/** A chat message as returned from the conversation history API */
export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
    citations?: Citation[];
    thinking_steps?: ThinkingStep[];
    tokens_used?: number;
}

export interface Conversation {
    id: string;
    organization_id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
}

export interface ConversationDetail extends Conversation {
    messages: ChatMessage[];
}

export interface ConversationListResponse {
    conversations: Conversation[];
    total: number;
}

/** SSE streaming callbacks for sendChatQueryStream */
export interface ChatStreamCallbacks {
    onThinking?: (step: string, message: string) => void;
    onToolCall?: (toolName: string, query: string) => void;
    onToolResult?: (toolName: string, resultCount: number) => void;
    onToken: (token: string) => void;
    onCitation?: (citation: Citation) => void;
    onDone: (data: { conversation_id: string; message_id: string }) => void;
    onError?: (error: string) => void;
}

/**
 * Send a chat query via SSE streaming.
 * The backend emits: thinking | token | citation | done | error
 */
export async function sendChatQueryStream(
    payload: ChatQueryPayload,
    token: string,
    callbacks: ChatStreamCallbacks,
    signal?: AbortSignal
): Promise<void> {
    const baseURL = config.apiBaseUrl;

    const response = await fetch(`${baseURL}/chat/query`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
        signal,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg =
            errorData?.detail
                ? typeof errorData.detail === "string"
                    ? errorData.detail
                    : JSON.stringify(errorData.detail)
                : `Server error: ${response.status}`;
        throw new Error(msg);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const eventTimeoutMs = 30000; // 30 second timeout per event

    try {
        while (true) {
            // Set a timeout for reading each chunk to detect stalled connections
            const readPromise = reader.read();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error("SSE stream timeout - no data received")),
                    eventTimeoutMs
                )
            );

            let result;
            try {
                result = await Promise.race([readPromise, timeoutPromise]);
            } catch (timeoutErr) {
                console.error("SSE stream stalled:", timeoutErr);
                throw timeoutErr;
            }

            const { done, value } = result as any;
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE messages are separated by double newlines
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";

            for (const part of parts) {
                if (!part.trim()) continue;

                let eventType = "";
                let dataStr = "";

                // Parse SSE format: event: type\ndata: {...}
                for (const line of part.split("\n")) {
                    if (line.startsWith("event: ")) {
                        eventType = line.slice(7).trim();
                    } else if (line.startsWith("data: ")) {
                        dataStr = line.slice(6).trim();
                    }
                }

                if (!eventType || !dataStr) {
                    console.debug("Skipping malformed SSE line:", { eventType, dataStr });
                    continue;
                }

                try {
                    const data = JSON.parse(dataStr);
                    switch (eventType) {
                        case "thinking":
                            callbacks.onThinking?.(data.step ?? "", data.message ?? "");
                            break;
                        case "tool_call":
                            callbacks.onToolCall?.(data.tool_name ?? "", data.query ?? "");
                            break;
                        case "tool_result":
                            callbacks.onToolResult?.(data.tool_name ?? "", data.result_count ?? 0);
                            break;
                        case "token":
                            callbacks.onToken(data.content ?? "");
                            break;
                        case "citation":
                            callbacks.onCitation?.(data.citation as Citation);
                            break;
                        case "done":
                            callbacks.onDone({
                                conversation_id: data.conversation_id,
                                message_id: data.message_id,
                            });
                            break;
                        case "error":
                            callbacks.onError?.(data.error ?? "Unknown error");
                            break;
                        default:
                            console.debug("Unknown SSE event type:", eventType);
                    }
                } catch (parseErr) {
                    console.error("Failed to parse SSE data:", { eventType, dataStr, error: parseErr });
                    // Continue processing other events
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

/** Create a new conversation */
export async function createConversation(title: string, token: string): Promise<Conversation> {
    return apiClient.post<Conversation>(`/chat/conversations?title=${encodeURIComponent(title)}`, undefined, { token });
}

/** List conversations (paginated) */
export async function listConversations(token: string, limit = 50, offset = 0): Promise<ConversationListResponse> {
    return apiClient.get<ConversationListResponse>(
        `/chat/conversations?limit=${limit}&offset=${offset}`,
        { token, cache: false }
    );
}

/** Get a conversation with all its messages */
export async function getConversation(conversationId: string, token: string): Promise<ConversationDetail> {
    return apiClient.get<ConversationDetail>(`/chat/conversations/${conversationId}`, { token, cache: false });
}

/** Delete a conversation */
export async function deleteConversation(conversationId: string, token: string) {
    return apiClient.delete<any>(`/chat/conversations/${conversationId}`, undefined, { token });
}

/** Update a conversation (e.g. rename title) */
export async function updateConversation(conversationId: string, payload: { title: string }, token: string) {
    return apiClient.patch<any>(`/chat/conversations/${conversationId}`, payload, { token });
}

/** Create a new organization */
export async function createOrganization(
    payload: {
        name: string;
        billing_address?: {
            line1: string;
            line2?: string;
            city: string;
            state: string;
            postal_code: string;
            country: string;
        };
    },
    token: string
) {
    return apiClient.post<any>("/org/", payload, { token });
}

