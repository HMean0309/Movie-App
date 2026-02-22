import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

export interface RoomState {
    currentTime: number;
    isPlaying: boolean;
    updatedBy: string;
}

export interface ChatMessage {
    userId: string;
    name: string;
    text: string;
    time: string;
}

export interface RoomMember {
    userId: string;
    user: {
        id: string;
        fullName: string | null;
        avatarUrl: string | null;
    };
}

interface Handlers {
    onState?: (state: RoomState) => void;
    onMembers?: (members: RoomMember[]) => void;
    onChat?: (msg: ChatMessage) => void;
    onEpisode?: (episodeId: string) => void;
    onError?: (msg: string) => void;
}

export function useWatchPartySocket(roomId: string | null, handlers: Handlers) {
    const { accessToken } = useAuthStore();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!roomId || !accessToken) return;

        const socket = io(SOCKET_URL, {
            auth: { token: accessToken },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('room:join', roomId);
        });

        socket.on('room:state', (state) => handlers.onState?.(state));
        socket.on('room:members', (members) => handlers.onMembers?.(members));
        socket.on('chat:message', (msg) => handlers.onChat?.(msg));
        socket.on('room:episode', (epId) => handlers.onEpisode?.(epId));
        socket.on('error', (msg) => handlers.onError?.(msg));

        return () => {
            socket.emit('room:leave', roomId);
            socket.disconnect();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, accessToken]);

    const emitPlay = useCallback((currentTime: number) => {
        socketRef.current?.emit('room:play', { roomId, currentTime });
    }, [roomId]);

    const emitPause = useCallback((currentTime: number) => {
        socketRef.current?.emit('room:pause', { roomId, currentTime });
    }, [roomId]);

    const emitSeek = useCallback((currentTime: number) => {
        socketRef.current?.emit('room:seek', { roomId, currentTime });
    }, [roomId]);

    const emitChat = useCallback((text: string) => {
        socketRef.current?.emit('chat:send', { roomId, text });
    }, [roomId]);

    const emitEpisode = useCallback((episodeId: string) => {
        socketRef.current?.emit('room:episode', { roomId, episodeId });
    }, [roomId]);

    return { emitPlay, emitPause, emitSeek, emitChat, emitEpisode };
}
