import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../stores/gameStore';
import { GameMap, MapObject } from '../../types';
import GameCanvas from './GameCanvas';
import HUD from './HUD';
import Chat from './Chat';
import VideoPanel from './VideoPanel';
import ObjectModal from './ObjectModal';
import MapEditor from '../editor/MapEditor';

export default function RoomPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const players = useGameStore(s => s.players);
  const setMessages = useGameStore(s => s.setMessages);

  const [gameMap, setGameMap] = useState<GameMap | null>(null);
  const [roomName, setRoomName] = useState('');
  const [activeObject, setActiveObject] = useState<MapObject | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useSocket();

  useEffect(() => {
    if (!slug || !token) return;
    Promise.all([
      apiFetch(`/api/rooms/${slug}`).then(r => r.json()),
      apiFetch(`/api/rooms/${slug}/messages`).then(r => r.json()),
    ]).then(([room, messages]) => {
      if (room.error) { navigate('/'); return; }
      setRoomName(room.name);
      setGameMap({
        width: room.width,
        height: room.height,
        tileSize: room.tile_size,
        layers: room.layers,
        objects: room.objects,
        spawnX: room.spawn_x,
        spawnY: room.spawn_y,
      });
      setMessages(messages);
      setLoading(false);
    });
  }, [slug, token]);

  if (!user || loading || !gameMap) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f1a', color: '#fff', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>🏢</div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>Carregando sala...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <GameCanvas
        gameMap={gameMap}
        roomSlug={slug!}
        onObjectInteract={setActiveObject}
      />

      <HUD
        roomName={roomName}
        onOpenEditor={() => setEditorOpen(true)}
        playerCount={players.size}
      />

      <VideoPanel />
      <Chat />

      {activeObject && (
        <ObjectModal object={activeObject} onClose={() => setActiveObject(null)} />
      )}

      {editorOpen && (
        <MapEditor
          gameMap={gameMap}
          roomSlug={slug!}
          token={token!}
          onClose={() => setEditorOpen(false)}
          onSave={(newMap) => {
            setGameMap(newMap);
            setEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}
