import { cacheManager } from "./cacheManager";

interface ApiOptions {
    cache?: boolean;
    cacheTTL?: number;
    token?: string;
}

function parseErrorDetail(errorData: any, defaultMsg: string): string {
    if (!errorData || errorData.detail === undefined || errorData.detail === null) {
        return defaultMsg;
    }
    const detail = errorData.detail;
    if (typeof detail === "string") {
        return detail;
    }
    if (Array.isArray(detail)) {
        return detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(", ");
    }
    if (typeof detail === "object") {
        return detail.message || detail.msg || JSON.stringify(detail);
    }
    return defaultMsg;
}

class ApiClient {
    private baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
    }

    async get<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
        const { cache = true, cacheTTL = 300000, token } = options;
        const activeToken = token || this.token;
        if (token && !this.token) {
            this.token = token;
        }

        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = `GET:${endpoint}`;

        // Check cache first
        if (cache) {
            const cachedData = cacheManager.get(cacheKey);
            if (cachedData) {
                console.log(`[Cache HIT] ${endpoint}`);
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
                console.log(`[Cache 304] ${endpoint}`);
                const cachedData = cacheManager.getExpired(cacheKey);
                if (cachedData) {
                    cacheManager.refresh(cacheKey, cacheTTL);
                    return cachedData;
                }
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
        // Invalidate caches for related endpoints
        if (endpoint.includes("/folders")) {
            cacheManager.invalidatePattern("/folders");
            cacheManager.invalidatePattern("/api/root-folder");
        }
        if (endpoint.includes("/files")) {
            cacheManager.invalidatePattern("/files");
            cacheManager.invalidatePattern("/folders");
            cacheManager.invalidatePattern("/api/root-folder");
        }
        if (endpoint.includes("/groups")) {
            cacheManager.invalidatePattern("/groups");
        }
        if (endpoint.includes("/rbac")) {
            cacheManager.invalidatePattern("/rbac");
        }
        if (endpoint.includes("/invite") || endpoint.includes("/auth")) {
            cacheManager.invalidatePattern("/auth");
            cacheManager.invalidatePattern("/invite");
        }
        if (endpoint.includes("/ocr")) {
            cacheManager.invalidatePattern("/ocr");
        }
        if (endpoint.includes("/chat")) {
            cacheManager.invalidatePattern("/chat");
        }
    }
}

export const apiClient = new ApiClient();
