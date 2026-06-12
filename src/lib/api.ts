import { apiClient } from "@/utils/apiClient";
import { config } from "../config";

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function syncUser(token: string) {
    return apiClient.post<any>("/auth/sync", undefined, { token });
}

export async function requestPasswordOtp(token: string) {
    return apiClient.post<{ message: string; email: string }>("/auth/request-password-otp", undefined, { token });
}

export async function changePassword(
    payload: { otp: string; new_password: string; confirm_password: string },
    token: string
) {
    return apiClient.post<{ message: string }>("/auth/change-password", payload, { token });
}

// ── Employees ─────────────────────────────────────────────────────────────────

export async function listEmployees(token: string) {
    return apiClient.get<any>("/auth/employees", { token, cache: false });
}

export async function deleteEmployee(employeeId: string, token: string) {
    return apiClient.delete<any>(`/auth/employees/${employeeId}`, undefined, { token });
}

export async function changeEmployeeRole(userId: string, roleName: string, token: string) {
    return apiClient.patch<any>(`/auth/employees/${userId}/role`, { role_name: roleName.toLowerCase() }, { token });
}

export async function toggleEmployeeStatus(userId: string, isActive: boolean, token: string) {
    return apiClient.patch<any>(`/auth/${userId}/status`, { is_active: isActive }, { token });
}

// ── Invites ───────────────────────────────────────────────────────────────────

export async function createInvite(payload: {
    email: string;
    first_name: string;
    last_name: string | null;
    role_name: string;
    employee_code?: string | null;
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

export async function verifyInviteToken(token: string) {
    return apiClient.get<{
        valid: boolean;
        message: string;
        email?: string;
        first_name?: string;
        last_name?: string;
    }>(`/invite/verify?token=${token}`, {});
}

export async function checkInviteUser(token: string) {
    return apiClient.get<{
        requires_password: boolean;
        existing_kinde_user: boolean;
        email: string;
    }>(`/invite/check-user?token=${token}`, {});
}

export async function acceptInvite(payload: {
    token: string;
    password?: string;
}) {
    return apiClient.post<{
        message: string;
        user_id: string;
        email: string;
        organization_id: string;
    }>("/invite/accept", payload, {});
}

export async function updateEmployeeDetails(
    userId: string,
    payload: {
        first_name?: string | null;
        last_name?: string | null;
        employee_code?: string | null;
    },
    token: string
) {
    return apiClient.patch<any>(`/auth/employees/${userId}`, payload, { token });
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
    return apiClient.get<any>("/api/root-folder/contents", { token, cache: false });
}

export async function getFolderContents(folderId: string, token: string) {
    return apiClient.get<any>(`/api/root-folder/folders/${folderId}/contents`, { token, cache: false });
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

export async function getAvailableFilesAndFolders(token: string) {
    return apiClient.get<any>("/groups/available-files", { token });
}

// ── Chat / RAG ────────────────────────────────────────────────────────────────

export interface ChatQueryPayload {
    query: string;
    conversation_id?: string;
    folder_id?: string;
    max_iterations?: number;
    model?: string;
    truncate_message_id?: string;
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
    onDone: (data: { conversation_id: string; message_id: string; tokens_used?: number }) => void;
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
    const eventTimeoutMs = 90000; // 90 second timeout per event

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
                                tokens_used: data.tokens_used,
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

/** Upload organization logo to S3 */
export async function uploadLogo(file: File, token: string) {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<{ logo_url: string; s3_key: string }>("/org/logo", formData, { token });
}

/** Create a new organization */
export async function createOrganization(
    payload: {
        name: string;
        logo_url?: string;
        email?: string;
        contact_number?: string;
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

/** Get organization details */
export async function getOrganization(orgId: string, token: string) {
    return apiClient.get<any>(`/org/${orgId}`, { token, cache: false });
}

/** Get organization settings */
export async function getOrganizationSettings(orgId: string, token: string) {
    return apiClient.get<any>(`/org/${orgId}/settings`, { token, cache: false });
}

/** Update organization details */
export async function updateOrganization(
    orgId: string,
    payload: {
        name?: string;
        logo_url?: string;
        email?: string;
        contact_number?: string;
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
    return apiClient.patch<any>(`/org/${orgId}`, payload, { token });
}

/** Delete organization logo */
export async function deleteOrgLogo(orgId: string, token: string) {
    return apiClient.patch<any>(`/org/${orgId}`, { logo_url: null }, { token });
}

/** Truncate messages in a conversation starting from or after a message ID */
export async function truncateConversation(
    conversationId: string,
    messageId: string,
    inclusive: boolean,
    token: string
): Promise<void> {
    return apiClient.delete<void>(
        `/chat/conversations/${conversationId}/messages/${messageId}?inclusive=${inclusive}`,
        undefined,
        { token }
    );
}

/** Upload user profile avatar image to S3 */
export async function uploadAvatar(file: File, token: string) {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<{ avatar_url: string }>("/auth/avatar", formData, { token });
}

/** Delete user profile avatar image */
export async function deleteAvatar(token: string) {
    return apiClient.delete<{ message: string }>("/auth/avatar", undefined, { token });
}

/** Update user profile first and last names */
export async function updateProfile(payload: { first_name: string; last_name: string; employee_code?: string | null }, token: string) {
    return apiClient.patch<any>("/auth/profile", payload, { token });
}



/** Clear all messages in a conversation */
export async function clearConversationMessages(
    conversationId: string,
    token: string
): Promise<void> {
    return apiClient.delete<void>(
        `/chat/conversations/${conversationId}/messages`,
        undefined,
        { token }
    );
}

// ── Usage ─────────────────────────────────────────────────────────────────────

export interface UsageStat {
    used: number;
    limit: number;
}

export interface UsageData {
    plan: string;
    pages: UsageStat;
    simple_interactions: UsageStat;
    complex_interactions: UsageStat;
}

/** Fetch organisation usage statistics (pages, simple & complex interactions) */
export async function getUsage(token: string): Promise<UsageData> {
    return apiClient.get<UsageData>("/auth/usage", { token, cache: false });
}

export async function getSubscription(token: string): Promise<any> {
    return apiClient.get<any>("/subscription/me", { token, cache: false });
}

export async function getSubscriptionSummary(token: string): Promise<any> {
    return apiClient.get<any>("/subscription/me/summary", { token, cache: false });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationItem {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    data: Record<string, any> | null;
    created_at: string;
}

export interface NotificationListResponse {
    notifications: NotificationItem[];
    unread_count: number;
}

export async function getNotifications(token: string): Promise<NotificationListResponse> {
    return apiClient.get<NotificationListResponse>("/notifications", { token, cache: false });
}

export async function markNotificationRead(notificationId: string, token: string): Promise<NotificationItem> {
    return apiClient.patch<NotificationItem>(`/notifications/${notificationId}/read`, undefined, { token });
}

export async function markAllNotificationsRead(token: string): Promise<{ message: string }> {
    return apiClient.patch<{ message: string }>("/notifications/read-all", {}, { token });
}

export async function deleteNotification(notificationId: string, token: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/notifications/${notificationId}`, undefined, { token });
}

export async function clearAllNotifications(token: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>("/notifications/clear-all", undefined, { token });
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface UserSettings {
    preferences: {
        theme?: string;
        [key: string]: any;
    };
}

export async function getUserSettings(token: string): Promise<UserSettings> {
    return apiClient.get<UserSettings>("/api/settings/", { token, cache: false });
}

export async function updateUserSettings(payload: Record<string, any>, token: string): Promise<UserSettings> {
    return apiClient.post<UserSettings>("/api/settings/", payload, { token });
}

export async function updateThemePreference(theme: string, token: string): Promise<UserSettings> {
    return apiClient.patch<UserSettings>("/api/settings/theme", { theme }, { token });
}

// ── Compliance ────────────────────────────────────────────────────────────────

export interface TermsStatus {
    tos_accepted: boolean;
    tos_accepted_at: string | null;
    tos_version: string | null;
    privacy_accepted: boolean;
    privacy_accepted_at: string | null;
    privacy_version: string | null;
}

export async function getTermsStatus(token: string): Promise<TermsStatus> {
    return apiClient.get<TermsStatus>("/api/compliance/terms-status", { token, cache: false });
}

export async function acceptTerms(token: string, tosVersion = "1.0", privacyVersion = "1.0") {
    return apiClient.post<{ status: string; accepted_at: string }>(
        "/api/compliance/accept-terms",
        { tos_version: tosVersion, privacy_version: privacyVersion },
        { token },
    );
}

export async function requestDataExport(token: string) {
    return apiClient.get<Record<string, unknown>>("/api/compliance/data-export", { token, cache: false });
}

export async function requestAccountDeletion(token: string) {
    return apiClient.post<{ status: string; request_id: string; message: string }>(
        "/api/compliance/deletion-request",
        undefined,
        { token },
    );
}
