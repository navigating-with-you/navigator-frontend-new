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
                    const token = await getToken();
                    if (token) {
                        apiClient.setToken(token);
                        cacheWebSocket.setToken(token);

                        try {
                            await cacheWebSocket.connect();
                            cacheWebSocket.startHeartbeat();
                        } catch (wsError) {
                            console.error("Failed to connect cache WebSocket:", wsError);
                        }

                        const userData = await syncUser(token);
                        localStorage.setItem("navigator_user_profile", JSON.stringify(userData));
                        window.dispatchEvent(new Event("navigator_user_synced"));
                        console.log("User synced successfully", userData);
                    }
                } catch (error) {
                    console.error("Failed to sync user:", error);
                    toast.error("Failed to sync your account details.");
                    syncStarted.current = false;
                }
            }
        };

        performSync();
    }, [isAuthenticated, getToken, user]);

    useEffect(() => {
        return () => {
            cacheWebSocket.disconnect();
        };
    }, []);

    return null;
}
