import Phaser from 'phaser';
import { GameMap, PlayerState, TILE_TYPES, OBJECT_CONFIGS, ObjectType } from '../types';
import { getSocket } from '../hooks/useSocket';
import { useGameStore } from '../stores/gameStore';

const TILE = 32;
const PROXIMITY_RADIUS = 5;

interface LocalPlayer {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
}

interface RemotePlayer {
  state: PlayerState;
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
}

export class GameScene extends Phaser.Scene {
  private gameMap!: GameMap;
  private localPlayer!: LocalPlayer;
  private remotePlayers = new Map<string, RemotePlayer>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private collisionGrid: boolean[] = [];
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private objectLayer!: Phaser.GameObjects.Container;
  private username = '';
  private avatarColor = '#4F46E5';
  private avatarEmoji = '😊';
  private lastMoveTime = 0;
  private onNearbyChanged?: (ids: Set<string>) => void;
  private onObjectInteract?: (id: string | null) => void;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: {
    gameMap: GameMap;
    username: string;
    avatarColor: string;
    avatarEmoji: string;
    onNearbyChanged: (ids: Set<string>) => void;
    onObjectInteract: (id: string | null) => void;
  }) {
    this.gameMap = data.gameMap;
    this.username = data.username;
    this.avatarColor = data.avatarColor;
    this.avatarEmoji = data.avatarEmoji;
    this.onNearbyChanged = data.onNearbyChanged;
    this.onObjectInteract = data.onObjectInteract;
  }

  create() {
    this.buildCollisionGrid();
    this.mapGraphics = this.add.graphics();
    this.objectLayer = this.add.container(0, 0);
    this.renderMap();
    this.renderObjects();
    this.spawnLocalPlayer();
    this.setupInput();
    this.setupCamera();
    this.setupSocketListeners();

    // Interaction key
    this.input.keyboard!.on('keydown-E', () => {
      this.checkObjectInteraction();
    });
  }

  private buildCollisionGrid() {
    const { width, height, layers } = this.gameMap;
    this.collisionGrid = new Array(width * height).fill(true);

    const floorLayer = layers.find(l => l.name === 'floor');
    const wallLayer = layers.find(l => l.name === 'walls');

    if (floorLayer) {
      floorLayer.data.forEach((tile, i) => {
        const info = TILE_TYPES[tile];
        if (!info || !info.walkable) this.collisionGrid[i] = false;
      });
    }
    if (wallLayer) {
      wallLayer.data.forEach((tile, i) => {
        if (tile !== 0) this.collisionGrid[i] = false;
      });
    }
    // Objects block movement
    this.gameMap.objects.forEach(obj => {
      if (obj.type === 'spawn') return;
      for (let dy = 0; dy < obj.height; dy++) {
        for (let dx = 0; dx < obj.width; dx++) {
          const ix = (obj.y + dy) * this.gameMap.width + (obj.x + dx);
          if (obj.type !== 'rug') this.collisionGrid[ix] = false;
        }
      }
    });
  }

  private renderMap() {
    const { width, height, layers } = this.gameMap;
    this.mapGraphics.clear();

    layers.forEach(layer => {
      layer.data.forEach((tile, i) => {
        if (tile === 0) return;
        const x = (i % width) * TILE;
        const y = Math.floor(i / width) * TILE;
        const info = TILE_TYPES[tile];
        if (!info) return;
        this.mapGraphics.fillStyle(parseInt(info.color.replace('#', '0x')));
        this.mapGraphics.fillRect(x, y, TILE, TILE);
        // Grid lines
        this.mapGraphics.lineStyle(1, 0x000000, 0.1);
        this.mapGraphics.strokeRect(x, y, TILE, TILE);
      });
    });
  }

  private renderObjects() {
    this.objectLayer.removeAll(true);
    this.gameMap.objects.forEach(obj => {
      if (obj.type === 'spawn') return;
      const cfg = OBJECT_CONFIGS[obj.type as ObjectType];
      if (!cfg) return;

      const x = obj.x * TILE;
      const y = obj.y * TILE;
      const w = obj.width * TILE;
      const h = obj.height * TILE;

      const bg = this.add.graphics();
      const color = parseInt(cfg.color.replace('#', '0x'));
      bg.fillStyle(color, 0.85);
      bg.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, 4);
      if (obj.interactive) {
        bg.lineStyle(2, 0xffffff, 0.3);
        bg.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 4);
      }

      const emojiText = this.add.text(x + w / 2, y + h / 2 - (obj.label ? 6 : 0), cfg.emoji, {
        fontSize: Math.min(w, h) * 0.5 + 'px',
      }).setOrigin(0.5);

      const container = this.add.container(0, 0, [bg, emojiText]);

      if (obj.label) {
        const label = this.add.text(x + w / 2, y + h - 6, obj.label, {
          fontSize: '10px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)',
          padding: { x: 3, y: 1 },
        }).setOrigin(0.5, 1);
        container.add(label);
      }

      if (obj.interactive) {
        const hint = this.add.text(x + w / 2, y - 4, '[E]', {
          fontSize: '9px', color: '#fbbf24',
        }).setOrigin(0.5, 1).setAlpha(0);
        container.add(hint);
        this.tweens.add({ targets: hint, alpha: 0.8, duration: 500, yoyo: true, repeat: -1 });
      }

      this.objectLayer.add(container);
    });
  }

  private spawnLocalPlayer() {
    const { spawnX, spawnY } = this.gameMap;
    this.localPlayer = this.createPlayerVisual(
      spawnX, spawnY, this.avatarColor, this.avatarEmoji, this.username, true
    ) as LocalPlayer;
    this.localPlayer.x = spawnX;
    this.localPlayer.y = spawnY;
  }

  private createPlayerVisual(
    tileX: number, tileY: number,
    color: string, emoji: string, username: string, isLocal: boolean
  ) {
    const px = tileX * TILE + TILE / 2;
    const py = tileY * TILE + TILE / 2;

    const circle = this.add.graphics();
    const c = parseInt(color.replace('#', '0x'));
    circle.fillStyle(c);
    circle.fillCircle(0, 0, 14);
    if (isLocal) {
      circle.lineStyle(2, 0xffffff, 0.8);
      circle.strokeCircle(0, 0, 14);
    }

    const emojiText = this.add.text(0, 0, emoji, { fontSize: '16px' }).setOrigin(0.5);
    const label = this.add.text(0, 20, username, {
      fontSize: '11px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    const container = this.add.container(px, py, [circle, emojiText]);
    container.setDepth(10);
    label.setDepth(11);

    return { container, label, x: tileX, y: tileY, direction: 'down' as const };
  }

  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  private setupCamera() {
    const { width, height } = this.gameMap;
    this.cameras.main.setBounds(0, 0, width * TILE, height * TILE);
    this.cameras.main.startFollow(this.localPlayer.container, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);
  }

  private setupSocketListeners() {
    const socket = getSocket();
    if (!socket) return;

    socket.on('player_moved', ({ id, x, y, direction }: any) => {
      const remote = this.remotePlayers.get(id);
      if (remote) {
        remote.targetX = x;
        remote.targetY = y;
        remote.state.x = x;
        remote.state.y = y;
        remote.state.direction = direction;
      }
    });

    socket.on('player_joined', (state: PlayerState) => {
      this.addRemotePlayer(state);
    });

    socket.on('player_left', ({ id }: { id: string }) => {
      this.removeRemotePlayer(id);
    });

    socket.on('room_state', ({ players }: { players: PlayerState[] }) => {
      players.forEach(p => this.addRemotePlayer(p));
    });
  }

  addRemotePlayer(state: PlayerState) {
    if (this.remotePlayers.has(state.id)) return;
    const visual = this.createPlayerVisual(state.x, state.y, state.avatarColor, state.avatarEmoji, state.username, false);
    this.remotePlayers.set(state.id, {
      state,
      container: visual.container,
      label: visual.label,
      targetX: state.x,
      targetY: state.y,
    });
  }

  removeRemotePlayer(id: string) {
    const remote = this.remotePlayers.get(id);
    if (remote) {
      remote.container.destroy();
      remote.label.destroy();
      this.remotePlayers.delete(id);
    }
  }

  private canWalk(tx: number, ty: number): boolean {
    const { width, height } = this.gameMap;
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false;
    return this.collisionGrid[ty * width + tx];
  }

  private checkObjectInteraction() {
    const { x, y } = this.localPlayer;
    const neighbors = [
      { x, y }, { x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 },
    ];
    for (const obj of this.gameMap.objects) {
      if (!obj.interactive) continue;
      for (const n of neighbors) {
        if (n.x >= obj.x && n.x < obj.x + obj.width && n.y >= obj.y && n.y < obj.y + obj.height) {
          this.onObjectInteract?.(obj.id);
          return;
        }
      }
    }
    this.onObjectInteract?.(null);
  }

  private updateProximity() {
    const nearby = new Set<string>();
    this.remotePlayers.forEach((remote, id) => {
      const dist = Math.sqrt(
        Math.pow(this.localPlayer.x - remote.state.x, 2) +
        Math.pow(this.localPlayer.y - remote.state.y, 2)
      );
      if (dist <= PROXIMITY_RADIUS) nearby.add(id);
    });
    this.onNearbyChanged?.(nearby);
    useGameStore.getState().setNearbyPlayers(nearby);
  }

  update(time: number) {
    const moveInterval = 150;
    if (time - this.lastMoveTime < moveInterval) {
      this.updateRemotePlayers();
      return;
    }

    let dx = 0, dy = 0;
    let direction = this.localPlayer.direction;

    const up = this.cursors.up.isDown || this.wasdKeys.W.isDown;
    const down = this.cursors.down.isDown || this.wasdKeys.S.isDown;
    const left = this.cursors.left.isDown || this.wasdKeys.A.isDown;
    const right = this.cursors.right.isDown || this.wasdKeys.D.isDown;

    if (up) { dy = -1; direction = 'up'; }
    else if (down) { dy = 1; direction = 'down'; }
    else if (left) { dx = -1; direction = 'left'; }
    else if (right) { dx = 1; direction = 'right'; }

    if (dx !== 0 || dy !== 0) {
      const newX = this.localPlayer.x + dx;
      const newY = this.localPlayer.y + dy;

      if (this.canWalk(newX, newY)) {
        this.localPlayer.x = newX;
        this.localPlayer.y = newY;
        this.localPlayer.direction = direction;

        const px = newX * TILE + TILE / 2;
        const py = newY * TILE + TILE / 2;
        this.localPlayer.container.setPosition(px, py);
        this.localPlayer.label.setPosition(px, py + 20);

        getSocket()?.emit('move', { x: newX, y: newY, direction });
        this.lastMoveTime = time;
        this.updateProximity();
      }
    }

    this.updateRemotePlayers();
  }

  private updateRemotePlayers() {
    this.remotePlayers.forEach(remote => {
      const targetPx = remote.targetX * TILE + TILE / 2;
      const targetPy = remote.targetY * TILE + TILE / 2;
      const cx = remote.container.x;
      const cy = remote.container.y;
      remote.container.setPosition(
        cx + (targetPx - cx) * 0.2,
        cy + (targetPy - cy) * 0.2,
      );
      remote.label.setPosition(remote.container.x, remote.container.y + 20);
    });
  }

  refreshMap(newMap: GameMap) {
    this.gameMap = newMap;
    this.buildCollisionGrid();
    this.renderMap();
    this.renderObjects();
  }
}
