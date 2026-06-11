import { cacheManager } from "./cacheManager";
import { config } from "../config";

interface CacheInvalidationEvent {
    event: string;
    org_id: string;
    resource_id: string | null;
    resource_type: string | null;
    metadata: Record<string, any>;
}

class CacheWebSocketManager {
    private ws: WebSocket | null = null;
    private url: string;
    private token: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000;
    private listeners: Map<string, Function[]> = new Map();
    private heartbeatTimer: any = null;

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

            // Avoid stacking connections
            if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
                if (import.meta.env.DEV) console.log("[WebSocket] Already connected or connecting, skipping new connection");
                resolve();
                return;
            }

            try {
                const wsBase = this.url.replace("http://", "ws://").replace("https://", "wss://");
                const wsUrl = `${wsBase}/cache/ws/invalidation?token=${this.token}`;
                if (import.meta.env.DEV) console.log("[WebSocket] Attempting to connect to:", wsUrl);
                this.ws = new WebSocket(wsUrl);

                // Track whether the initial handshake succeeded
                let settled = false;
                const timeout = setTimeout(() => {
                    if (!settled) {
                        console.error("[WebSocket] Connection timeout (30s)");
                        settled = true;
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
                    settled = true;
                    this.emit("ws:connected", {});
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error("[WebSocket] Error:", error);
                    if (!settled) {
                        // Initial connection failed — reject and don't reconnect
                        settled = true;
                        reject(error);
                    }
                };

                this.ws.onclose = () => {
                    clearTimeout(timeout);
                    if (import.meta.env.DEV) console.log("[WebSocket] Disconnected");
                    this.emit("ws:disconnected", {});
                    if (settled) {
                        // Was connected, then dropped — attempt reconnect
                        this.attemptReconnect();
                    }
                    // If !settled: onerror already rejected — no reconnect
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    private handleMessage(data: string) {
        try {
            // Skip non-JSON messages (like "pong" heartbeat)
            if (!data.startsWith("{")) {
                console.debug("[WebSocket] Skipping non-JSON message:", data);
                return;
            }

            const event: CacheInvalidationEvent = JSON.parse(data);
            if (import.meta.env.DEV) console.log("[Cache Invalidation]", event);

            // Invalidate cache based on event type
            this.invalidateByEvent(event);

            // Notify listeners
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
                // Handled directly in TopBar component subscription
                break;

            default:
                if (import.meta.env.DEV) console.log("[Cache] Unknown event:", event.event);
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            if (import.meta.env.DEV) console.log(
                `[WebSocket] Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
            );
            setTimeout(() => this.connect().catch(console.error), this.reconnectDelay);
        } else {
            console.error("[WebSocket] Max reconnection attempts reached");
        }
    }

    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    off(event: string, callback: Function) {
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
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
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

    // Heartbeat to keep connection alive
    startHeartbeat(interval: number = 30000) {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        this.heartbeatTimer = setInterval(() => {
            this.send("ping");
        }, interval);
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

export const cacheWebSocket = new CacheWebSocketManager();
