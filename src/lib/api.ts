import { apiClient } from "@/utils/apiClient";

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

/**
 * Get the root-level contents (child folders + files) of the org root folder.
 * Uses the hierarchical root-folder API.
 */
export async function getRootContents(token: string) {
    return apiClient.get<any>("/api/root-folder/contents", { token, cache: false });
}

/**
 * Get the contents (child sub-folders + files) of any folder by ID.
 * Uses the hierarchical root-folder API.
 */
export async function getFolderContents(folderId: string, token: string) {
    return apiClient.get<any>(`/api/root-folder/folders/${folderId}/contents`, { token, cache: false });
}

export async function createFolder(payload: { name: string; description?: string }, token: string) {
    return apiClient.post<any>("/folders/", payload, { token });
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

/** Search in a specific folder's vector namespace */
export async function vectorSearch(folderId: string, query: string, token: string, topK = 10) {
    return apiClient.post<any>(`/ocr/search/${folderId}`, { query, top_k: topK }, { token });
}

/** Get the OCR job for a specific file */
export async function getFileOcrJob(fileId: string, token: string) {
    return apiClient.get<any>(`/ocr/jobs/file/${fileId}`, { token, cache: false });
}

/** List all OCR jobs for a folder */
export async function listFolderOcrJobs(folderId: string, token: string, statusFilter?: string) {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : "";
    return apiClient.get<any>(`/ocr/jobs/folder/${folderId}${qs}`, { token, cache: false });
}

/** Get a specific OCR job by ID */
export async function getOcrJob(jobId: string, token: string) {
    return apiClient.get<any>(`/ocr/jobs/${jobId}`, { token, cache: false });
}

/** Retry a failed OCR job */
export async function retryOcrJob(jobId: string, token: string) {
    return apiClient.post<any>(`/ocr/jobs/${jobId}/retry`, undefined, { token });
}

/** Get org-level OCR statistics */
export async function getOcrStats(token: string) {
    return apiClient.get<any>("/ocr/stats", { token, cache: false });
}

// ── Groups / Categories ───────────────────────────────────────────────────────

export async function listGroups(token: string) {
    return apiClient.get<any>("/groups/", { token, cache: false });
}

export async function createGroup(payload: { name: string; description?: string }, token: string) {
    return apiClient.post<any>("/groups/", payload, { token });
}

export async function getGroup(groupId: string, token: string) {
    return apiClient.get<any>(`/groups/${groupId}`, { token, cache: false });
}

export async function updateGroup(groupId: string, payload: { name?: string; description?: string }, token: string) {
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
