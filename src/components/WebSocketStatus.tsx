import { useEffect, useState } from 'react';
import { cacheWebSocket } from '@/utils/cacheWebSocket';

/**
 * Shows real-time connectivity indicator
 * Green dot = Connected, Yellow dot = Reconnecting, Red dot = Disconnected
 */
export function WebSocketStatus() {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const sync = () => setIsConnected(cacheWebSocket.isConnected());
        sync();

        cacheWebSocket.on('ws:connected', sync);
        cacheWebSocket.on('ws:disconnected', sync);

        // Poll briefly on mount to catch the race where ws:connected fires
        // before this effect registers its listener (common on first login).
        const pollInterval = setInterval(sync, 250);
        const stopPolling = setTimeout(() => clearInterval(pollInterval), 6000);

        return () => {
            clearInterval(pollInterval);
            clearTimeout(stopPolling);
            cacheWebSocket.off('ws:connected', sync);
            cacheWebSocket.off('ws:disconnected', sync);
        };
    }, []);

    return (
        <div className="flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isConnected
                ? 'bg-green-500'
                : 'bg-yellow-500'
                }`} />
            <span className="text-[10px] sm:text-xs font-medium text-zinc-650 dark:text-zinc-400 hidden sm:inline select-none">
                {isConnected ? 'Connected' : 'Connecting...'}
            </span>
        </div>
    );
}
