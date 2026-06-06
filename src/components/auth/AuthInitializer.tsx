import { useEffect, useRef } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { syncUser } from "@/lib/api";
import { toast } from "sonner";
import { apiClient } from "@/utils/apiClient";
import { cacheWebSocket } from "@/utils/cacheWebSocket";

export default function AuthInitializer() {
    const { isAuthenticated, getToken, user } = useKindeAuth();
    const syncStarted = useRef(false);

    useEffect(() => {
        const performSync = async () => {
            if (isAuthenticated && !syncStarted.current) {
                syncStarted.current = true;
                try {
                    const audience = (window as any).env?.VITE_KINDE_AUDIENCE || import.meta.env.VITE_KINDE_AUDIENCE || undefined;
                    // Request an access token for the API audience so backend accepts it
                    const token = await getToken(audience ? { audience } : undefined);
                    if (token) {
                        apiClient.setToken(token);
                        cacheWebSocket.setToken(token);

                        try {
                            await cacheWebSocket.connect();
                            cacheWebSocket.startHeartbeat();
                        } catch (wsError) {
                            console.warn("[WebSocket] Cache invalidation WS unavailable — real-time updates disabled:", wsError);
                        }

                        const userData = await syncUser(token);
                        sessionStorage.setItem("navigator_user_profile", JSON.stringify(userData));
                        window.dispatchEvent(new Event("navigator_user_synced"));
                        if (import.meta.env.DEV) {
                            console.log("User synced successfully", userData);
                        }
                    }
                } catch (error) {
                    console.error("Failed to sync user:", error);
                    toast.error("Failed to sync your account details.");
                    syncStarted.current = false;
                    window.dispatchEvent(new Event("navigator_user_sync_failed"));
                }
            } else if (!isAuthenticated && syncStarted.current) {
                apiClient.clearToken();
                cacheWebSocket.disconnect();
                sessionStorage.removeItem("navigator_user_profile");
                syncStarted.current = false;
            }
        };

        const handleRetry = () => {
            syncStarted.current = false;
            performSync();
        };

        window.addEventListener("navigator_retry_sync", handleRetry);
        performSync();

        return () => {
            window.removeEventListener("navigator_retry_sync", handleRetry);
        };
    }, [isAuthenticated, getToken, user]);

    useEffect(() => {
        return () => {
            cacheWebSocket.disconnect();
        };
    }, []);

    return null;
}
