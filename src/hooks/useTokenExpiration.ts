import { useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { apiClient } from '@/utils/apiClient';
import { toast } from 'sonner';

/**
 * Custom hook for handling Kinde token expiration.
 * Monitors token expiration and refreshes automatically before expiry.
 * Shows warning if token is about to expire.
 * 
 * Usage: Call this once in your main App component
 * 
 * @param warningThresholdMs Show warning when token expires in this many milliseconds (default: 5 minutes)
 * @param refreshThresholdMs Auto-refresh when token expires in this many milliseconds (default: 1 minute)
 */
export function useTokenExpiration(
  warningThresholdMs: number = 5 * 60 * 1000, // 5 minutes
  refreshThresholdMs: number = 1 * 60 * 1000, // 1 minute
) {
  const { getToken, logout } = useKindeAuth();

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        // Parse JWT to get expiration
        const parts = token.split('.');
        if (parts.length !== 3) return;

        try {
          // Decode payload (second part)
          const payload = JSON.parse(atob(parts[1]));
          const expirationTime = payload.exp * 1000; // Convert to milliseconds
          const now = Date.now();
          const timeRemaining = expirationTime - now;

          // Token already expired
          if (timeRemaining < 0) {
            toast.error('Your session has expired. Please log in again.');
            logout?.();
            return;
          }

          // Token about to expire - show warning
          if (timeRemaining < warningThresholdMs && timeRemaining > refreshThresholdMs) {
            toast.warning('Your session is about to expire. Please refresh the page.');
          }

          // Token expiring soon - attempt refresh
          if (timeRemaining < refreshThresholdMs) {
            try {
              const newToken = await getToken?.();
              if (newToken) {
                apiClient.setToken(newToken);
                toast.success('Session refreshed');
              }
            } catch (err) {
              console.error('Token refresh failed:', err);
              toast.error('Failed to refresh session. Please log in again.');
              logout?.();
            }
          }
        } catch (err) {
          console.error('Failed to parse token expiration:', err);
        }
      } catch (err) {
        console.error('Token check failed:', err);
      }
    };

    // Check token immediately
    checkToken();

    // Check every minute
    const interval = setInterval(checkToken, 60 * 1000);
    return () => clearInterval(interval);
  }, [getToken, logout, warningThresholdMs, refreshThresholdMs]);
}
