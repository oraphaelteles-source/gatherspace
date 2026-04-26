import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

interface PlayerState {
  id: string;
  userId: string;
  username: string;
  avatarColor: string;
  avatarEmoji: string;
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  roomSlug: string;
}

const players = new Map<string, PlayerState>();
const roomPlayers = new Map<string, Set<string>>();

function getRoomPlayers(roomSlug: string): PlayerState[] {
  const ids = roomPlayers.get(roomSlug) || new Set();
  return Array.from(ids)
    .map(id => players.get(id))
    .filter(Boolean) as PlayerState[];
}

export function setupGameSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;

    socket.on('join_room', async ({ roomSlug, spawnX, spawnY, avatarColor, avatarEmoji }) => {
      socket.join(roomSlug);

      const state: PlayerState = {
        id: socket.id,
        userId: user.id,
        username: user.username,
        avatarColor: avatarColor || '#4F46E5',
        avatarEmoji: avatarEmoji || '😊',
        x: spawnX || 5,
        y: spawnY || 5,
        direction: 'down',
        roomSlug,
      };

      players.set(socket.id, state);
      if (!roomPlayers.has(roomSlug)) roomPlayers.set(roomSlug, new Set());
      roomPlayers.get(roomSlug)!.add(socket.id);

      // Send existing players to newcomer
      socket.emit('room_state', {
        players: getRoomPlayers(roomSlug).filter(p => p.id !== socket.id),
      });

      // Notify others
      socket.to(roomSlug).emit('player_joined', state);
    });

    socket.on('move', ({ x, y, direction }) => {
      const player = players.get(socket.id);
      if (!player) return;
      player.x = x;
      player.y = y;
      player.direction = direction;

      socket.to(player.roomSlug).emit('player_moved', {
        id: socket.id,
        x,
        y,
        direction,
      });

      // Check proximity for WebRTC
      const roommates = getRoomPlayers(player.roomSlug).filter(p => p.id !== socket.id);
      for (const other of roommates) {
        const dist = Math.sqrt(Math.pow(player.x - other.x, 2) + Math.pow(player.y - other.y, 2));
        const wasNear = false; // simplified — client handles proximity state
        const isNear = dist <= 5;
        socket.emit('proximity_update', { peerId: other.id, near: isNear });
      }
    });

    socket.on('chat_message', async ({ content, type }) => {
      const player = players.get(socket.id);
      if (!player || !content?.trim()) return;

      const room = await pool.query('SELECT id FROM rooms WHERE slug = $1', [player.roomSlug]);
      if (!room.rows[0]) return;

      await pool.query(
        'INSERT INTO messages (room_id, user_id, username, content, type) VALUES ($1, $2, $3, $4, $5)',
        [room.rows[0].id, player.userId, player.username, content.trim(), type || 'global']
      );

      const msg = {
        id: Date.now().toString(),
        username: player.username,
        content: content.trim(),
        type: type || 'global',
        createdAt: new Date().toISOString(),
      };

      if (type === 'proximity') {
        const nearby = getRoomPlayers(player.roomSlug).filter(p => {
          const dist = Math.sqrt(Math.pow(player.x - p.x, 2) + Math.pow(player.y - p.y, 2));
          return dist <= 5;
        });
        nearby.forEach(p => io.to(p.id).emit('chat_message', msg));
        socket.emit('chat_message', msg);
      } else {
        io.to(player.roomSlug).emit('chat_message', msg);
      }
    });

    // WebRTC signaling
    socket.on('webrtc_offer', ({ to, offer }) => {
      io.to(to).emit('webrtc_offer', { from: socket.id, offer });
    });

    socket.on('webrtc_answer', ({ to, answer }) => {
      io.to(to).emit('webrtc_answer', { from: socket.id, answer });
    });

    socket.on('webrtc_ice', ({ to, candidate }) => {
      io.to(to).emit('webrtc_ice', { from: socket.id, candidate });
    });

    socket.on('disconnect', () => {
      const player = players.get(socket.id);
      if (player) {
        socket.to(player.roomSlug).emit('player_left', { id: socket.id });
        roomPlayers.get(player.roomSlug)?.delete(socket.id);
        players.delete(socket.id);
      }
    });
  });
}
