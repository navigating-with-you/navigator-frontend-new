import { useEffect, useRef } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { syncUser } from "@/lib/api";
import { toast } from "sonner";
import { apiClient } from "@/utils/apiClient";
import { cacheWebSocket } from "@/utils/cacheWebSocket";
import { useUserProfile } from "@/contexts/UserContext";

export default function AuthInitializer() {
    const { isAuthenticated, getToken, user } = useKindeAuth();
    const { setUserProfile, clearUserProfile } = useUserProfile();
    const syncStarted = useRef(false);
    const wsRetryCount = useRef(0);

    useEffect(() => {
        if (isAuthenticated) {
            apiClient.setTokenRefresher(() => getToken() as Promise<string | null>);
        }
    }, [isAuthenticated, getToken]);

    useEffect(() => {
        const performSync = async () => {
            if (isAuthenticated && !syncStarted.current) {
                syncStarted.current = true;
                try {
                    const token = await getToken();
                    if (token) {
                        apiClient.setToken(token);
                        cacheWebSocket.setToken(token);

                        // Retry WebSocket connection up to 3 times
                        let wsConnected = false;
                        for (let i = 0; i < 3; i++) {
                            try {
                                await cacheWebSocket.connect();
                                cacheWebSocket.startHeartbeat();
                                wsConnected = true;
                                wsRetryCount.current = 0;
                                break;
                            } catch (wsError) {
                                console.warn(`[WebSocket] Connection attempt ${i + 1} failed:`, wsError);
                                if (i < 2) {
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                            }
                        }

                        if (!wsConnected) {
                            console.warn("[WebSocket] Cache invalidation WS unavailable after 3 attempts — real-time updates disabled");
                        }

                        const userData = await syncUser(token);
                        setUserProfile(userData);
                        window.dispatchEvent(new Event("navigator_user_synced"));
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
                clearUserProfile();
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
    }, [isAuthenticated, getToken, user, setUserProfile, clearUserProfile]);

    useEffect(() => {
        return () => {
            cacheWebSocket.disconnect();
        };
    }, []);

    return null;
}
