import { useEffect, useState, useCallback, useRef } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { listConversations, type Conversation } from "@/lib/api";
import { cacheManager } from "@/utils/cacheManager";

const CONVERSATIONS_CACHE_KEY = "conversations_list";
const CONVERSATIONS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface UseCachedConversationsOptions {
  enabled?: boolean;
  onLoad?: (conversations: Conversation[]) => void;
}

export function useCachedConversations(
  options: UseCachedConversationsOptions = {}
) {
  const { enabled = true, onLoad } = options;
  const { getToken, isAuthenticated } = useKindeAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isFetching = useRef(false);

  // Fetch from API with silent mode option
  const fetchConversations = useCallback(
    async (showLoading = true, force = false) => {
      if (!isAuthenticated) return;
      if (isFetching.current && !force) return; // Prevent duplicate requests

      try {
        // Try to get from cache first (unless forced)
        if (!force) {
          const cached = cacheManager.get(CONVERSATIONS_CACHE_KEY);
          if (cached) {
            setConversations(cached);
            onLoad?.(cached);
            return;
          }
        }

        isFetching.current = true;
        if (showLoading) {
          setIsLoading(true);
        }

        const token = await getToken();
        if (!token) {
          throw new Error("No authentication token");
        }

        const data = await listConversations(token, 100, 0);
        const convList = data.conversations || [];

        // Cache with ETag for future revalidation
        cacheManager.set(
          CONVERSATIONS_CACHE_KEY,
          convList,
          (data as any).etag || `etag-${Date.now()}`,
          CONVERSATIONS_CACHE_TTL
        );

        setConversations(convList);
        setError(null);
        onLoad?.(convList);
      } catch (err: any) {
        console.error("Failed to fetch conversations:", err);
        setError(err);
        // Fall back to stale cache if available
        const stale = cacheManager.getExpired(CONVERSATIONS_CACHE_KEY);
        if (stale) {
          setConversations(stale);
          onLoad?.(stale);
        }
      } finally {
        isFetching.current = false;
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [isAuthenticated, getToken, onLoad]
  );

  // Initial fetch on mount if authenticated
  useEffect(() => {
    if (enabled && isAuthenticated) {
      fetchConversations(true);
    }
  }, [enabled, isAuthenticated, fetchConversations]);

  // Add a new conversation to cache
  const addConversation = useCallback((conversation: Conversation) => {
    setConversations((prev) => [conversation, ...prev]);
    // Invalidate cache so next fetch gets fresh data
    cacheManager.invalidate(CONVERSATIONS_CACHE_KEY);
  }, []);

  // Delete a conversation from cache
  const deleteConversation = useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    cacheManager.invalidate(CONVERSATIONS_CACHE_KEY);
  }, []);

  // Update a conversation in cache
  const updateConversation = useCallback(
    (conversationId: string, updates: Partial<Conversation>) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, ...updates } : c))
      );
      cacheManager.invalidate(CONVERSATIONS_CACHE_KEY);
    },
    []
  );

  // Force refresh (bypass cache)
  const refresh = useCallback(() => {
    fetchConversations(false, true);
  }, [fetchConversations]);

  // Listen for conversation events and update cache
  useEffect(() => {
    const handleNewConversation = () => {
      // Invalidate cache when new conversation created
      cacheManager.invalidate(CONVERSATIONS_CACHE_KEY);
      // Fetch fresh data silently
      if (enabled && isAuthenticated) {
        fetchConversations(false, true);
      }
    };

    const handleConversationDeleted = () => {
      // Invalidate cache when conversation deleted
      cacheManager.invalidate(CONVERSATIONS_CACHE_KEY);
    };

    if (enabled) {
      window.addEventListener("navigator_conversation_created", handleNewConversation);
      window.addEventListener("navigator_conversation_deleted", handleConversationDeleted);

      return () => {
        window.removeEventListener("navigator_conversation_created", handleNewConversation);
        window.removeEventListener("navigator_conversation_deleted", handleConversationDeleted);
      };
    }
  }, [enabled, isAuthenticated, fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
    refresh,
    addConversation,
    deleteConversation,
    updateConversation,
  };
}
