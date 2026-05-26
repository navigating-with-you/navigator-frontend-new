import { useEffect, useState, useCallback, useRef } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { getRootContents } from "@/lib/api";
import { cacheManager } from "@/utils/cacheManager";
import { cacheWebSocket } from "@/utils/cacheWebSocket";

const FILES_LIST_CACHE_KEY = "files_list_root";
const FILES_LIST_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for files list

interface CachedFile {
  id: string;
  name: string;
  size: string;
  mimeType: string;
}

interface UseCachedFilesOptions {
  enabled?: boolean;
  onLoad?: (files: CachedFile[]) => void;
}

export function useCachedFiles(options: UseCachedFilesOptions = {}) {
  const { enabled = true, onLoad } = options;
  const { getToken, isAuthenticated } = useKindeAuth();

  const [files, setFiles] = useState<CachedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isFetching = useRef(false);

  // Fetch from API with silent mode option
  const fetchFiles = useCallback(
    async (showLoading = true, force = false) => {
      if (!isAuthenticated) return;
      if (isFetching.current && !force) return; // Prevent duplicate requests

      try {
        // Try to get from cache first (unless forced)
        if (!force) {
          const cached = cacheManager.get(FILES_LIST_CACHE_KEY);
          if (cached) {
            setFiles(cached);
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

        const data = await getRootContents(token);
        const fileList = Array.isArray(data?.files) ? data.files : [];
        
        const mappedFiles: CachedFile[] = fileList.map((f: any) => ({
          id: f.id,
          name: f.name,
          size: f.size ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : "Unknown Size",
          mimeType: f.mime_type || "application/octet-stream",
        }));

        // Cache with ETag for future revalidation
        cacheManager.set(
          FILES_LIST_CACHE_KEY,
          mappedFiles,
          data.etag || `etag-${Date.now()}`,
          FILES_LIST_CACHE_TTL
        );

        setFiles(mappedFiles);
        setError(null);
        onLoad?.(mappedFiles);
      } catch (err: any) {
        console.error("Failed to fetch files:", err);
        setError(err);
        // Fall back to stale cache if available
        const stale = cacheManager.getExpired(FILES_LIST_CACHE_KEY);
        if (stale) {
          setFiles(stale);
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
      fetchFiles(true);
    }
  }, [enabled, isAuthenticated, fetchFiles]);

  // Listen to WebSocket events for file changes
  useEffect(() => {
    const handleFileChange = () => {
      cacheManager.invalidate(FILES_LIST_CACHE_KEY);
      // Fetch fresh data silently
      if (enabled && isAuthenticated) {
        fetchFiles(false, true);
      }
    };

    if (enabled) {
      cacheWebSocket.on("file:created", handleFileChange);
      cacheWebSocket.on("file:updated", handleFileChange);
      cacheWebSocket.on("file:deleted", handleFileChange);

      return () => {
        cacheWebSocket.off("file:created", handleFileChange);
        cacheWebSocket.off("file:updated", handleFileChange);
        cacheWebSocket.off("file:deleted", handleFileChange);
      };
    }
  }, [enabled, isAuthenticated, fetchFiles]);

  // Force refresh (bypass cache)
  const refresh = useCallback(() => {
    fetchFiles(false, true);
  }, [fetchFiles]);

  return {
    files,
    isLoading,
    error,
    refresh,
  };
}
