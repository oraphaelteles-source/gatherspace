import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { PlayerState, ChatMessage } from '../types';

let socketInstance: Socket | null = null;

export function getSocket(): Socket | null {
  return socketInstance;
}

export function useSocket() {
  const token = useAuthStore(s => s.token);
  const socketRef = useRef<Socket | null>(null);

  const addPlayer = useGameStore(s => s.addPlayer);
  const removePlayer = useGameStore(s => s.removePlayer);
  const updatePlayer = useGameStore(s => s.updatePlayer);
  const setPlayers = useGameStore(s => s.setPlayers);
  const addMessage = useGameStore(s => s.addMessage);

  useEffect(() => {
    if (!token) return;

    const socket = io(import.meta.env.VITE_API_URL || '', {
      auth: { token },
      transports: ['websocket'],
    });

    socketInstance = socket;
    socketRef.current = socket;

    socket.on('room_state', ({ players }: { players: PlayerState[] }) => {
      setPlayers(players);
    });

    socket.on('player_joined', (player: PlayerState) => {
      addPlayer(player);
    });

    socket.on('player_moved', ({ id, x, y, direction }: any) => {
      updatePlayer(id, { x, y, direction });
    });

    socket.on('player_left', ({ id }: { id: string }) => {
      removePlayer(id);
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      addMessage(msg);
    });

    return () => {
      socket.disconnect();
      socketInstance = null;
    };
  }, [token]);

  return socketRef.current;
}
