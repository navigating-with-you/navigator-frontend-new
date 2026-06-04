import { useCallback, useEffect, useState, useRef } from 'react';
import { cacheWebSocket } from '@/utils/cacheWebSocket';

export interface FileProcessingState {
  fileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
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
  fileIds = [],
  enabled = true,
  onStatusChange,
  onAllComplete,
}: UseRealTimeFileProcessingOptions) {
  const [states, setStates] = useState<Record<string, FileProcessingState>>({});
  const onStatusChangeRef = useRef(onStatusChange);
  const onAllCompleteRef = useRef(onAllComplete);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    onAllCompleteRef.current = onAllComplete;
  }, [onAllComplete]);

  // Keep tracking completed files to trigger onAllComplete
  const completedFilesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const handleOcrEvent = (event: any) => {
      // Determine fileId from metadata or resource_id
      const fileId = event.metadata?.file_id || event.resource_id;
      if (!fileId) return;

      // If fileIds is provided and not empty, check if this file is of interest
      if (fileIds.length > 0 && !fileIds.includes(fileId)) return;

      const rawStatus = event.metadata?.status || event.metadata?.ocr_status || '';
      
      // Map event type or rawStatus to our frontend statuses:
      // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
      let status: FileProcessingState['status'] = 'processing';
      
      if (event.event === 'ocr:job_completed' || rawStatus === 'completed' || rawStatus === 'success') {
        status = 'completed';
      } else if (event.event === 'ocr:job_created' || rawStatus === 'pending' || rawStatus === 'queued') {
        status = 'pending';
      } else if (rawStatus === 'failed') {
        status = 'failed';
      } else if (rawStatus === 'cancelled') {
        status = 'cancelled';
      } else if (rawStatus === 'processing') {
        status = 'processing';
      }

      const state: FileProcessingState = {
        fileId,
        status,
        progress: event.metadata?.progress_percentage ?? (status === 'completed' ? 100 : 0),
        message: event.metadata?.progress_message || '',
        error: event.metadata?.error_message || undefined,
      };

      setStates((prev) => ({ ...prev, [fileId]: state }));
      onStatusChangeRef.current?.(state);

      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        completedFilesRef.current.add(fileId);
      } else {
        completedFilesRef.current.delete(fileId);
      }

      // Check if all requested files are complete
      if (fileIds.length > 0 && fileIds.every((id) => completedFilesRef.current.has(id))) {
        onAllCompleteRef.current?.();
      }
    };

    cacheWebSocket.on('ocr:job_created', handleOcrEvent);
    cacheWebSocket.on('ocr:job_updated', handleOcrEvent);
    cacheWebSocket.on('ocr:job_completed', handleOcrEvent);

    return () => {
      cacheWebSocket.off('ocr:job_created', handleOcrEvent);
      cacheWebSocket.off('ocr:job_updated', handleOcrEvent);
      cacheWebSocket.off('ocr:job_completed', handleOcrEvent);
    };
  }, [enabled, fileIds]);

  const getFileProcessingState = useCallback((fileId: string): FileProcessingState | null => {
    return states[fileId] || null;
  }, [states]);

  const getAllProcessingStates = useCallback(() => {
    return Object.values(states);
  }, [states]);

  const isProcessing = useCallback((fileId: string): boolean => {
    const s = states[fileId]?.status;
    return s === 'pending' || s === 'processing';
  }, [states]);

  return {
    processingStates: Object.values(states),
    getFileProcessingState,
    getAllProcessingStates,
    isProcessing,
  };
}
