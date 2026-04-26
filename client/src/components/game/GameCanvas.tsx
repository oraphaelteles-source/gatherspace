import { useEffect, useRef, useCallback, useState } from 'react';
import Phaser from 'phaser';
import { GameScene } from '../../scenes/GameScene';
import { GameMap, MapObject } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { getSocket } from '../../hooks/useSocket';

interface Props {
  gameMap: GameMap;
  roomSlug: string;
  onObjectInteract: (obj: MapObject | null) => void;
}

export default function GameCanvas({ gameMap, roomSlug, onObjectInteract }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const user = useAuthStore(s => s.user);
  const setNearbyPlayers = useGameStore(s => s.setNearbyPlayers);

  const handleNearbyChanged = useCallback((ids: Set<string>) => {
    setNearbyPlayers(ids);
  }, [setNearbyPlayers]);

  const handleObjectInteract = useCallback((objId: string | null) => {
    if (!objId) { onObjectInteract(null); return; }
    const obj = gameMap.objects.find(o => o.id === objId);
    onObjectInteract(obj || null);
  }, [gameMap.objects, onObjectInteract]);

  useEffect(() => {
    if (!containerRef.current || !user) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: containerRef.current,
      backgroundColor: '#1a1a2e',
      scene: [GameScene],
      render: { pixelArt: true, antialias: false },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    game.events.on('ready', () => {
      const scene = game.scene.getScene('GameScene') as GameScene;
      sceneRef.current = scene;
      scene.scene.start('GameScene', {
        gameMap,
        username: user.username,
        avatarColor: user.avatarColor,
        avatarEmoji: user.avatarEmoji,
        onNearbyChanged: handleNearbyChanged,
        onObjectInteract: handleObjectInteract,
      });

      // Join socket room after scene starts
      const socket = getSocket();
      if (socket) {
        socket.emit('join_room', {
          roomSlug,
          spawnX: gameMap.spawnX,
          spawnY: gameMap.spawnY,
          avatarColor: user.avatarColor,
          avatarEmoji: user.avatarEmoji,
        });
      }
    });

    const handleResize = () => {
      game.scale.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // When map is updated externally (editor), refresh scene
  useEffect(() => {
    sceneRef.current?.refreshMap(gameMap);
  }, [gameMap]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
