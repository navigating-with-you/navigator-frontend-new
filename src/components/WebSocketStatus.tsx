import { useEffect, useState } from 'react';
import { cacheWebSocket } from '@/utils/cacheWebSocket';

/**
 * Shows real-time connectivity indicator
 * Green dot = Connected, Yellow dot = Reconnecting, Red dot = Disconnected
 */
export function WebSocketStatus() {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Check if WebSocket is already connected
        const isInitiallyConnected = cacheWebSocket.isConnected();
        setIsConnected(isInitiallyConnected);

        // Listen for connection events
        const handleConnect = () => {
            setIsConnected(true);
        };

        const handleDisconnect = () => {
            setIsConnected(false);
        };

        cacheWebSocket.on('ws:connected', handleConnect);
        cacheWebSocket.on('ws:disconnected', handleDisconnect);

        return () => {
            cacheWebSocket.off('ws:connected', handleConnect);
            cacheWebSocket.off('ws:disconnected', handleDisconnect);
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
