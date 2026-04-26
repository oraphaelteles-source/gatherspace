import { create } from 'zustand';
import { PlayerState, ChatMessage, MapObject } from '../types';

interface GameState {
  players: Map<string, PlayerState>;
  messages: ChatMessage[];
  nearbyPlayers: Set<string>;
  activeObject: MapObject | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isSharingScreen: boolean;

  addPlayer: (player: PlayerState) => void;
  removePlayer: (id: string) => void;
  updatePlayer: (id: string, update: Partial<PlayerState>) => void;
  setPlayers: (players: PlayerState[]) => void;

  addMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;

  setNearbyPlayers: (ids: Set<string>) => void;
  setActiveObject: (obj: MapObject | null) => void;

  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  players: new Map(),
  messages: [],
  nearbyPlayers: new Set(),
  activeObject: null,
  isMuted: false,
  isVideoOff: false,
  isSharingScreen: false,

  addPlayer: (player) =>
    set(s => { const m = new Map(s.players); m.set(player.id, player); return { players: m }; }),

  removePlayer: (id) =>
    set(s => { const m = new Map(s.players); m.delete(id); return { players: m }; }),

  updatePlayer: (id, update) =>
    set(s => {
      const m = new Map(s.players);
      const p = m.get(id);
      if (p) m.set(id, { ...p, ...update });
      return { players: m };
    }),

  setPlayers: (players) =>
    set(() => ({ players: new Map(players.map(p => [p.id, p])) })),

  addMessage: (msg) =>
    set(s => ({ messages: [...s.messages.slice(-99), msg] })),

  setMessages: (msgs) => set({ messages: msgs }),

  setNearbyPlayers: (ids) => set({ nearbyPlayers: ids }),

  setActiveObject: (obj) => set({ activeObject: obj }),

  toggleMute: () => set(s => ({ isMuted: !s.isMuted })),
  toggleVideo: () => set(s => ({ isVideoOff: !s.isVideoOff })),
  toggleScreenShare: () => set(s => ({ isSharingScreen: !s.isSharingScreen })),
}));
