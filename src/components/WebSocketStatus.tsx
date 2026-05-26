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
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-200">
            <div className={`w-2 h-2 rounded-full ${isConnected
                    ? 'bg-green-500'
                    : 'bg-yellow-500'
                }`} />
            <span className="text-xs font-medium text-gray-600">
                {isConnected ? 'Live' : 'Connecting...'}
            </span>
        </div>
    );
}
