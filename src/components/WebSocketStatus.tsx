import { useEffect, useState } from 'react';
import { cacheWebSocket } from '@/utils/cacheWebSocket';

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

/**
 * Shows real-time connectivity indicator.
 * Green = Connected, Yellow (pulsing) = Reconnecting, Red = Disconnected
 */
export function WebSocketStatus() {
    const [status, setStatus] = useState<ConnectionStatus>(() =>
        cacheWebSocket.isConnected() ? 'connected' : 'disconnected'
    );

    useEffect(() => {
        const onConnected = () => setStatus('connected');
        // If we were connected and then dropped, show "Reconnecting".
        // If we were already disconnected (e.g. initial load), stay "disconnected".
        const onDisconnected = () => setStatus(prev =>
            prev === 'connected' ? 'reconnecting' : 'disconnected'
        );

        // cacheWebSocket.on() replays the current state immediately for ws:connected
        // and ws:disconnected — no polling needed to catch the initial state.
        cacheWebSocket.on('ws:connected', onConnected);
        cacheWebSocket.on('ws:disconnected', onDisconnected);

        return () => {
            cacheWebSocket.off('ws:connected', onConnected);
            cacheWebSocket.off('ws:disconnected', onDisconnected);
        };
    }, []);

    const dotClass =
        status === 'connected'
            ? 'bg-green-500'
            : status === 'reconnecting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500';

    const label =
        status === 'connected'
            ? 'Connected'
            : status === 'reconnecting'
                ? 'Reconnecting...'
                : 'Disconnected';

    return (
        <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
            <span className="text-[10px] sm:text-xs font-medium text-zinc-650 dark:text-zinc-400 hidden sm:inline select-none">
                {label}
            </span>
        </div>
    );
}
