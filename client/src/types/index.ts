export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  avatarColor: string;
  avatarEmoji: string;
}

export interface Room {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail?: string;
  maxUsers: number;
}

export interface MapLayer {
  name: string;
  data: number[];
}

export interface MapObject {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  interactive: boolean;
  url?: string;
}

export type ObjectType =
  | 'desk'
  | 'meeting_table'
  | 'whiteboard'
  | 'tv'
  | 'plant'
  | 'bookshelf'
  | 'sofa'
  | 'coffee_machine'
  | 'door'
  | 'rug'
  | 'spawn';

export interface GameMap {
  width: number;
  height: number;
  tileSize: number;
  layers: MapLayer[];
  objects: MapObject[];
  spawnX: number;
  spawnY: number;
}

export interface PlayerState {
  id: string;
  userId: string;
  username: string;
  avatarColor: string;
  avatarEmoji: string;
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface ChatMessage {
  id: string;
  username: string;
  content: string;
  type: 'global' | 'proximity';
  createdAt: string;
}

export const TILE_TYPES: Record<number, { color: string; label: string; walkable: boolean }> = {
  0: { color: '#1a1a2e', label: 'Vazio', walkable: false },
  1: { color: '#3d5a80', label: 'Piso Escritório', walkable: true },
  2: { color: '#2d2d44', label: 'Parede', walkable: false },
  3: { color: '#5c7a5c', label: 'Piso Grama', walkable: true },
  4: { color: '#8b7355', label: 'Piso Madeira', walkable: true },
  5: { color: '#6b6b8a', label: 'Piso Concreto', walkable: true },
  6: { color: '#4a7c59', label: 'Tapete Verde', walkable: true },
  7: { color: '#c9a84c', label: 'Tapete Amarelo', walkable: true },
  8: { color: '#9b4dca', label: 'Tapete Roxo', walkable: true },
};

export const OBJECT_CONFIGS: Record<ObjectType, {
  label: string;
  emoji: string;
  defaultWidth: number;
  defaultHeight: number;
  interactive: boolean;
  color: string;
}> = {
  desk: { label: 'Mesa', emoji: '🖥️', defaultWidth: 2, defaultHeight: 1, interactive: false, color: '#8b6914' },
  meeting_table: { label: 'Mesa de Reunião', emoji: '📋', defaultWidth: 4, defaultHeight: 3, interactive: true, color: '#5b4d3e' },
  whiteboard: { label: 'Quadro Branco', emoji: '📝', defaultWidth: 3, defaultHeight: 2, interactive: true, color: '#f0f0f0' },
  tv: { label: 'TV / Tela', emoji: '📺', defaultWidth: 2, defaultHeight: 1, interactive: true, color: '#222' },
  plant: { label: 'Planta', emoji: '🌿', defaultWidth: 1, defaultHeight: 1, interactive: false, color: '#2d6a4f' },
  bookshelf: { label: 'Estante', emoji: '📚', defaultWidth: 2, defaultHeight: 1, interactive: false, color: '#774936' },
  sofa: { label: 'Sofá', emoji: '🛋️', defaultWidth: 3, defaultHeight: 1, interactive: false, color: '#457b9d' },
  coffee_machine: { label: 'Café', emoji: '☕', defaultWidth: 1, defaultHeight: 1, interactive: true, color: '#6b3f2a' },
  door: { label: 'Porta', emoji: '🚪', defaultWidth: 1, defaultHeight: 1, interactive: false, color: '#a0522d' },
  rug: { label: 'Tapete', emoji: '🟫', defaultWidth: 3, defaultHeight: 2, interactive: false, color: '#c07850' },
  spawn: { label: 'Spawn', emoji: '🟢', defaultWidth: 1, defaultHeight: 1, interactive: false, color: '#00ff00' },
};
