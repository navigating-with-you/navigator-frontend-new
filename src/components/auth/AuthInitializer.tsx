import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
    const queryClient = useQueryClient();

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

                        const userData = await syncUser(token);
                        setUserProfile(userData);
                        window.dispatchEvent(new Event("navigator_user_synced"));

                        // Connect WebSocket ONLY if user has an organization (onboarding complete)
                        if (userData && userData.organization_id) {
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
                        } else {
                            if (import.meta.env.DEV) {
                                console.log("[WebSocket] Skipping connection during onboarding (no organization_id)");
                            }
                        }
                    }
                } catch (error: any) {
                    console.error("Failed to sync user:", error);
                    const detail = error?.message && !error.message.startsWith("API error:")
                        ? error.message
                        : "Please refresh the page or sign in again.";
                    toast.error(`Failed to sync your account details. ${detail}`);
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

        const handleTermsAccepted = async () => {
            if (cacheWebSocket.isConnected()) return;
            try {
                const token = await getToken();
                if (token) {
                    cacheWebSocket.setToken(token);
                    await cacheWebSocket.connect();
                    cacheWebSocket.startHeartbeat();
                }
            } catch {
                // Silent — WS is non-critical
            }
        };

        const handleOnboardingCompleted = async () => {
            // Invalidate queries so permissions and user info refetch
            queryClient.invalidateQueries();

            if (cacheWebSocket.isConnected()) return;
            try {
                const token = await getToken();
                if (token) {
                    cacheWebSocket.setToken(token);
                    await cacheWebSocket.connect();
                    cacheWebSocket.startHeartbeat();
                }
            } catch (err) {
                console.error("[WebSocket] Connection failed after onboarding:", err);
            }
        };

        window.addEventListener("navigator_retry_sync", handleRetry);
        window.addEventListener("navigator_terms_accepted", handleTermsAccepted);
        window.addEventListener("navigator_onboarding_completed", handleOnboardingCompleted);
        performSync();

        return () => {
            window.removeEventListener("navigator_retry_sync", handleRetry);
            window.removeEventListener("navigator_terms_accepted", handleTermsAccepted);
            window.removeEventListener("navigator_onboarding_completed", handleOnboardingCompleted);
        };
    }, [isAuthenticated, getToken, user, setUserProfile, clearUserProfile, queryClient]);

    useEffect(() => {
        return () => {
            cacheWebSocket.disconnect();
        };
    }, []);

    return null;
}
