/**
 * File processing state management (stub)
 * WebSocket connections removed - use polling or manual status checks instead
 */

import { useCallback } from 'react';

interface FileProcessingState {
  fileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
}

interface UseRealTimeFileProcessingOptions {
  folderId: string | null;
  fileIds?: string[];
  enabled?: boolean;
  onStatusChange?: (state: FileProcessingState) => void;
  onAllComplete?: () => void;
}

export function useRealTimeFileProcessing({
  folderId: _folderId,
  fileIds: _fileIds = [],
  enabled: _enabled = true,
  onStatusChange: _onStatusChange,
  onAllComplete: _onAllComplete,
}: UseRealTimeFileProcessingOptions) {

  const getFileProcessingState = useCallback((_fileId: string): FileProcessingState | null => {
    // Always return null since WebSocket is disabled
    return null;
  }, []);

  const getAllProcessingStates = useCallback(() => {
    return [];
  }, []);

  const isProcessing = useCallback((_fileId: string): boolean => {
    return false;
  }, []);

  return {
    processingStates: [],
    getFileProcessingState,
    getAllProcessingStates,
    isProcessing,
  };
}
