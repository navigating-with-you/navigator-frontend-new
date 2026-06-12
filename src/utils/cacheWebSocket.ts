import { cacheManager } from "./cacheManager";
import { config } from "../config";

interface CacheInvalidationEvent {
    event: string;
    org_id: string;
    resource_id: string | null;
    resource_type: string | null;
    metadata: Record<string, any>;
}

type WSListener = (data: any) => void;

class CacheWebSocketManager {
    private ws: WebSocket | null = null;
    private url: string;
    private token: string | null = null;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 5;
    private readonly baseReconnectDelay = 3000;
    private listeners: Map<string, WSListener[]> = new Map();
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.url = config.wsUrl || config.apiBaseUrl.replace("http://", "ws://").replace("https://", "wss://");
    }

    setToken(token: string) {
        this.token = token;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.token) {
                reject(new Error("Token not set"));
                return;
            }

            if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
                if (import.meta.env.DEV) console.log("[WebSocket] Already connected or connecting, skipping new connection");
                resolve();
                return;
            }

            try {
                const wsBase = this.url.replace("http://", "ws://").replace("https://", "wss://");
                // NOTE: Token in query string is a known risk (visible in server/proxy logs).
                // Migrate to a post-connect auth message once the backend WebSocket endpoint
                // supports reading the token from an initial JSON auth message instead of the URL.
                const wsUrl = `${wsBase}/cache/ws/invalidation?token=${this.token}`;
                if (import.meta.env.DEV) console.log("[WebSocket] Attempting to connect");
                this.ws = new WebSocket(wsUrl);

                // `resolved` tracks whether the connect() promise has settled.
                // `connectedOnce` tracks whether onopen ever fired — used to decide
                // whether onclose should trigger a reconnect (drop) or not (initial failure).
                let resolved = false;
                let connectedOnce = false;

                const timeout = setTimeout(() => {
                    if (!resolved) {
                        console.error("[WebSocket] Connection timeout (30s)");
                        resolved = true;
                        if (this.ws) {
                            this.ws.close();
                            this.ws = null;
                        }
                        reject(new Error("WebSocket connection timeout"));
                    }
                }, 30000);

                this.ws.onopen = () => {
                    clearTimeout(timeout);
                    if (import.meta.env.DEV) console.log("[WebSocket] Connected successfully");
                    this.reconnectAttempts = 0;
                    resolved = true;
                    connectedOnce = true;
                    // Heartbeat is always restarted here — covers both initial connect and reconnects.
                    this.startHeartbeat();
                    this.emit("ws:connected", {});
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error("[WebSocket] Error:", error);
                    if (!resolved) {
                        resolved = true;
                        reject(error);
                    }
                };

                this.ws.onclose = () => {
                    clearTimeout(timeout);
                    if (import.meta.env.DEV) console.log("[WebSocket] Disconnected");
                    this.stopHeartbeat();
                    this.emit("ws:disconnected", {});
                    // Reconnect only when the connection was previously established.
                    // If connectedOnce is false, onerror already rejected — no reconnect.
                    if (connectedOnce) {
                        this.attemptReconnect();
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    private handleMessage(data: string) {
        try {
            if (!data.startsWith("{")) {
                console.debug("[WebSocket] Skipping non-JSON message:", data);
                return;
            }

            const event: CacheInvalidationEvent = JSON.parse(data);
            if (import.meta.env.DEV) console.log("[Cache Invalidation]", event);

            this.invalidateByEvent(event);
            this.emit(event.event, event);
        } catch (error) {
            console.error("[WebSocket] Failed to parse message:", error);
        }
    }

    private invalidateByEvent(event: CacheInvalidationEvent) {
        switch (event.event) {
            case "folder:created":
            case "folder:updated":
            case "folder:deleted":
                cacheManager.invalidatePattern("/folders");
                cacheManager.invalidatePattern("/api/root-folder");
                break;

            case "file:created":
            case "file:updated":
            case "file:deleted":
                cacheManager.invalidatePattern("/files");
                cacheManager.invalidatePattern("/folders");
                cacheManager.invalidatePattern("/api/root-folder");
                break;

            case "share:created":
            case "share:updated":
            case "share:deleted":
                cacheManager.invalidatePattern("/files");
                cacheManager.invalidatePattern("/folders");
                cacheManager.invalidatePattern("/api/root-folder");
                break;

            case "user:added":
            case "user:updated":
            case "user:removed":
                cacheManager.invalidatePattern("/auth");
                cacheManager.invalidatePattern("/invite");
                break;

            case "ocr:job_created":
            case "ocr:job_updated":
            case "ocr:job_completed":
                cacheManager.invalidatePattern("/ocr");
                cacheManager.invalidatePattern("/folders");
                cacheManager.invalidatePattern("/api/root-folder");
                cacheManager.invalidatePattern("/files");
                break;

            case "notification:created":
                break;

            case "group:member_added":
            case "group:member_removed":
            case "group:file_added":
            case "group:file_removed":
                cacheManager.invalidatePattern("/groups");
                cacheManager.invalidatePattern("/folders");
                cacheManager.invalidatePattern("/api/root-folder");
                break;

            default:
                if (import.meta.env.DEV) console.log("[Cache] Unknown event:", event.event);
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("[WebSocket] Max reconnection attempts reached");
            return;
        }
        this.reconnectAttempts++;
        // Exponential backoff with jitter to avoid thundering herd on server restart.
        const backoff = Math.min(30000, this.baseReconnectDelay * 2 ** (this.reconnectAttempts - 1));
        const delay = backoff + Math.random() * 1000;
        if (import.meta.env.DEV) console.log(
            `[WebSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
        this.reconnectTimer = setTimeout(() => this.connect().catch(console.error), delay);
    }

    on(event: string, callback: WSListener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);

        // Replay current connection state immediately so late subscribers never miss
        // an event that fired before they registered (e.g. WebSocketStatus on first login).
        if (event === "ws:connected" && this.isConnected()) callback({});
        if (event === "ws:disconnected" && !this.isConnected()) callback({});
    }

    off(event: string, callback: WSListener) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    private emit(event: string, data: any) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach((callback) => callback(data));
    }

    disconnect() {
        this.stopHeartbeat();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnectAttempts = 0;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    send(message: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        }
    }

    startHeartbeat(interval: number = 30000) {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            this.send("ping");
        }, interval);
    }

    private stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

export const cacheWebSocket = new CacheWebSocketManager();
