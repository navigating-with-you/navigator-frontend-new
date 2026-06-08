import { cacheManager } from "./cacheManager";
import { config } from "../config";

interface ApiOptions {
    cache?: boolean;
    cacheTTL?: number;
    token?: string;
}

function parseErrorDetail(errorData: any, defaultMsg: string): string {
    // Handle Pydantic validation errors (422 response)
    if (errorData.detail && Array.isArray(errorData.detail)) {
        return errorData.detail
            .map((e: any) => e.msg || e.message || JSON.stringify(e))
            .join(", ");
    }

    // Handle string detail messages
    if (typeof errorData.detail === "string") {
        return errorData.detail;
    }

    // Handle object detail with message/msg properties
    if (typeof errorData.detail === "object" && errorData.detail !== null) {
        return errorData.detail.message || errorData.detail.msg || JSON.stringify(errorData.detail);
    }

    // Handle top-level error/message properties
    if (errorData.error && typeof errorData.error === "string") {
        return errorData.error;
    }
    if (errorData.message && typeof errorData.message === "string") {
        return errorData.message;
    }

    return defaultMsg;
}

class ApiClient {
    private baseURL = config.apiBaseUrl;
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
    }

    clearToken() {
        this.token = null;
        cacheManager.clear();
    }

    async get<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
        const { cache = true, cacheTTL = 300000, token } = options;
        const activeToken = token || this.token;
        if (token && !this.token) {
            this.token = token;
        }

        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = `GET:${activeToken ? activeToken.slice(-16) : "anonymous"}:${endpoint}`;

        // Check cache first
        if (cache) {
            const cachedData = cacheManager.get(cacheKey);
            if (cachedData) {
                if (import.meta.env.DEV) console.log(`[Cache HIT] ${endpoint}`);
                return cachedData;
            }
        }

        // Prepare headers
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        if (activeToken) {
            headers["Authorization"] = `Bearer ${activeToken}`;
        }

        // Add ETag if we have one
        const etag = cacheManager.getETag(cacheKey);
        if (etag) {
            headers["If-None-Match"] = etag;
        }

        try {
            const response = await fetch(url, {
                method: "GET",
                headers,
            });

            // 304 Not Modified - use cached data
            if (response.status === 304) {
                if (import.meta.env.DEV) console.log(`[Cache 304] ${endpoint}`);
                const cachedData = cacheManager.getExpired(cacheKey);
                if (cachedData) {
                    cacheManager.refresh(cacheKey, cacheTTL);
                    return cachedData;
                }
                // No stale cache available — fall through to a fresh fetch without ETag
                // by retrying without the If-None-Match header
                const retryHeaders: HeadersInit = { "Content-Type": "application/json" };
                if (activeToken) retryHeaders["Authorization"] = `Bearer ${activeToken}`;
                const retryResponse = await fetch(url, { method: "GET", headers: retryHeaders });
                if (!retryResponse.ok) {
                    const errorData = await retryResponse.json().catch(() => ({}));
                    throw new Error(parseErrorDetail(errorData, `API error: ${retryResponse.status}`));
                }
                const retryData = await retryResponse.json();
                const retryETag = retryResponse.headers.get("ETag");
                if (cache) {
                    cacheManager.set(cacheKey, retryData, retryETag ?? `etag-${Date.now()}`, cacheTTL);
                }
                return retryData;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(parseErrorDetail(errorData, `API error: ${response.status}`));
            }

            const data = await response.json();
            const newETag = response.headers.get("ETag");

            // Store in cache
            if (cache && newETag) {
                cacheManager.set(cacheKey, data, newETag, cacheTTL);
            } else if (cache) {
                // Also cache if no ETag but cache is requested
                cacheManager.set(cacheKey, data, `etag-${Date.now()}`, cacheTTL);
            }

            return data;
        } catch (error) {
            console.error(`API error: ${endpoint}`, error);
            throw error;
        }
    }

    async post<T>(endpoint: string, body?: any, options: { token?: string } = {}): Promise<T> {
        const activeToken = options.token || this.token;
        const url = `${this.baseURL}${endpoint}`;

        const headers: HeadersInit = {};
        if (activeToken) {
            headers["Authorization"] = `Bearer ${activeToken}`;
        }

        let fetchBody: any;
        if (body instanceof FormData) {
            // Do not set Content-Type for FormData, browser sets multipart/form-data with correct boundary
            fetchBody = body;
        } else if (body !== undefined) {
            headers["Content-Type"] = "application/json";
            fetchBody = JSON.stringify(body);
        }

        const response = await fetch(url, {
            method: "POST",
            headers,
            body: fetchBody,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(parseErrorDetail(errorData, `API error: ${response.status}`));
        }

        const data = await response.json();

        // Invalidate related caches
        this.invalidateRelatedCaches(endpoint);

        return data;
    }

    async patch<T>(endpoint: string, body: any, options: { token?: string } = {}): Promise<T> {
        const activeToken = options.token || this.token;
        const url = `${this.baseURL}${endpoint}`;

        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        if (activeToken) {
            headers["Authorization"] = `Bearer ${activeToken}`;
        }

        const response = await fetch(url, {
            method: "PATCH",
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(parseErrorDetail(errorData, `API error: ${response.status}`));
        }

        const data = await response.json();

        // Invalidate related caches
        this.invalidateRelatedCaches(endpoint);

        return data;
    }

    async delete<T>(endpoint: string, body?: any, options: { token?: string } = {}): Promise<T> {
        const activeToken = options.token || this.token;
        const url = `${this.baseURL}${endpoint}`;

        const headers: HeadersInit = {};
        if (activeToken) {
            headers["Authorization"] = `Bearer ${activeToken}`;
        }

        let fetchBody: any;
        if (body !== undefined) {
            headers["Content-Type"] = "application/json";
            fetchBody = JSON.stringify(body);
        }

        const response = await fetch(url, {
            method: "DELETE",
            headers,
            body: fetchBody,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(parseErrorDetail(errorData, `API error: ${response.status}`));
        }

        // Invalidate related caches
        this.invalidateRelatedCaches(endpoint);

        const text = await response.text();
        try {
            return text ? JSON.parse(text) : ({} as T);
        } catch {
            return {} as T;
        }
    }

    private invalidateRelatedCaches(endpoint: string) {
        // Group operations (both specific and lists)
        if (endpoint.includes("/groups")) {
            cacheManager.invalidatePattern("groups");
        }

        // File operations (upload, delete, list, etc.)
        if (endpoint.includes("/files")) {
            cacheManager.invalidatePattern("files");
            cacheManager.invalidatePattern("root-folder");
            cacheManager.invalidatePattern("folders");
        }

        // Folder operations
        if (endpoint.includes("/folders") || endpoint.includes("/api/root-folder/folders")) {
            cacheManager.invalidatePattern("folders");
            cacheManager.invalidatePattern("root-folder");
        }

        // Extract folder ID from various endpoint patterns
        const folderIdMatch = endpoint.match(/\/folders\/([a-f0-9-]+)/i);
        const folderFromBodyMatch = endpoint.match(/\/folders\/([a-f0-9-]+)\/(upload|files)/i);
        
        // Extract file ID from various endpoint patterns
        const fileIdMatch = endpoint.match(/\/files\/([a-f0-9-]+)/i);
        
        // Handle folder operations (create, update, delete, upload files)
        if (folderIdMatch || folderFromBodyMatch) {
            const folderId = folderIdMatch?.[1] || folderFromBodyMatch?.[1];
            if (folderId) {
                // Only invalidate this specific folder's cache
                cacheManager.invalidatePattern(`folders/${folderId}`);
                // Also invalidate root folder if files were added/removed
                if (endpoint.includes("upload") || endpoint.includes("files")) {
                    cacheManager.invalidatePattern("root-folder");
                }
            }
        }
        // Handle file operations (delete, share, download)
        else if (fileIdMatch) {
            const fileId = fileIdMatch[1];
            // Only invalidate this specific file's cache
            cacheManager.invalidatePattern(`files/${fileId}`);
            // If deleting file, also invalidate parent folder (file count changed)
            if (endpoint.includes("DELETE") || endpoint.toLowerCase().includes("delete")) {
                cacheManager.invalidatePattern("folders");
            }
        }
        // Handle RBAC operations (assign/revoke)
        if (endpoint.includes("/rbac")) {
            const resourceMatch = endpoint.match(/\/rbac\/([a-z]+)\/([a-f0-9-]+)/i);
            if (resourceMatch) {
                const resourceType = resourceMatch[1]; // "folder", "file", etc.
                const resourceId = resourceMatch[2];
                // Only invalidate permissions for this specific resource
                cacheManager.invalidatePattern(`rbac/${resourceType}/${resourceId}`);
            } else {
                cacheManager.invalidatePattern("rbac");
            }
        }
        // Handle auth/invite operations
        if (endpoint.includes("/invite") || endpoint.includes("/auth")) {
            const isEmployeeInvite = endpoint.includes("employee");
            if (isEmployeeInvite) {
                // Only invalidate employees cache (not all auth)
                cacheManager.invalidatePattern("employees");
            } else if (endpoint.includes("/auth/refresh")) {
                // Don't invalidate anything for token refresh
            } else {
                // For other auth changes, invalidate auth caches
                cacheManager.invalidatePattern("auth");
            }
        }
        // Handle OCR operations
        if (endpoint.includes("/ocr")) {
            const fileIdMatch = endpoint.match(/\/ocr\/([a-f0-9-]+)/i);
            if (fileIdMatch) {
                // Only invalidate this specific OCR result
                cacheManager.invalidatePattern(`ocr/${fileIdMatch[1]}`);
            } else {
                cacheManager.invalidatePattern("ocr");
            }
        }
        // Handle chat operations
        if (endpoint.includes("/chat")) {
            const sessionIdMatch = endpoint.match(/\/chat\/([a-f0-9-]+)/i);
            if (sessionIdMatch) {
                // Only invalidate this specific chat session's cache
                cacheManager.invalidatePattern(`chat/${sessionIdMatch[1]}`);
            } else {
                cacheManager.invalidatePattern("chat");
            }
        }

        if (import.meta.env.DEV) {
            console.log(`[Cache Invalidate] ${endpoint} - selective invalidation applied`);
        }
    }
}

export const apiClient = new ApiClient();
