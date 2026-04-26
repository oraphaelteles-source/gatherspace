import { useState, useRef, useCallback, useEffect } from 'react';
import { GameMap, MapObject, TILE_TYPES, OBJECT_CONFIGS, ObjectType } from '../../types';
import { apiFetch } from '../../lib/api';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  gameMap: GameMap;
  roomSlug: string;
  token: string;
  onClose: () => void;
  onSave: (map: GameMap) => void;
}

type Tool = 'paint' | 'erase' | 'object' | 'spawn' | 'select';

export default function MapEditor({ gameMap, roomSlug, token, onClose, onSave }: Props) {
  const [map, setMap] = useState<GameMap>(JSON.parse(JSON.stringify(gameMap)));
  const [tool, setTool] = useState<Tool>('paint');
  const [selectedTile, setSelectedTile] = useState(1);
  const [selectedObjectType, setSelectedObjectType] = useState<ObjectType>('desk');
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const TILE = 20;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const { width, height, layers, objects } = map;
    const tileSize = TILE * zoom;

    canvas.width = width * tileSize;
    canvas.height = height * tileSize;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Layers
    layers.forEach(layer => {
      layer.data.forEach((tile, i) => {
        if (tile === 0) return;
        const x = (i % width) * tileSize;
        const y = Math.floor(i / width) * tileSize;
        const info = TILE_TYPES[tile];
        if (!info) return;
        ctx.fillStyle = info.color;
        ctx.fillRect(x, y, tileSize, tileSize);
      });
    });

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath(); ctx.moveTo(x * tileSize, 0); ctx.lineTo(x * tileSize, height * tileSize); ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * tileSize); ctx.lineTo(width * tileSize, y * tileSize); ctx.stroke();
    }

    // Objects
    objects.forEach(obj => {
      const cfg = OBJECT_CONFIGS[obj.type as ObjectType];
      if (!cfg) return;
      const x = obj.x * tileSize;
      const y = obj.y * tileSize;
      const w = obj.width * tileSize;
      const h = obj.height * tileSize;

      ctx.fillStyle = obj.type === 'spawn' ? 'rgba(0,255,0,0.4)' : cfg.color + 'cc';
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

      if (selectedObject === obj.id) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      }

      ctx.font = `${Math.min(w, h) * 0.5}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cfg.emoji, x + w / 2, y + h / 2);

      if (obj.label) {
        ctx.font = `${Math.max(8, tileSize * 0.35)}px sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.fillText(obj.label, x + w / 2, y + h - 2);
      }
    });

    // Spawn
    const spawn = objects.find(o => o.type === 'spawn');
    if (!spawn) {
      const sx = map.spawnX * tileSize + tileSize / 2;
      const sy = map.spawnY * tileSize + tileSize / 2;
      ctx.fillStyle = '#00ff00';
      ctx.beginPath(); ctx.arc(sx, sy, tileSize * 0.3, 0, Math.PI * 2); ctx.fill();
    }
  }, [map, zoom, selectedObject]);

  useEffect(() => { draw(); }, [draw]);

  const getTileCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const tileSize = TILE * zoom;
    const tx = Math.floor((e.clientX - rect.left) / tileSize);
    const ty = Math.floor((e.clientY - rect.top) / tileSize);
    return { tx, ty };
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { tx, ty } = getTileCoords(e);
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return;

    if (tool === 'paint') {
      setMap(m => {
        const newLayers = m.layers.map((l, i) =>
          i === selectedLayer
            ? { ...l, data: l.data.map((t, idx) => idx === ty * m.width + tx ? selectedTile : t) }
            : l
        );
        return { ...m, layers: newLayers };
      });
    } else if (tool === 'erase') {
      setMap(m => {
        const newLayers = m.layers.map((l, i) =>
          i === selectedLayer
            ? { ...l, data: l.data.map((t, idx) => idx === ty * m.width + tx ? 0 : t) }
            : l
        );
        // Also remove objects at this tile
        const newObjects = m.objects.filter(obj => !(obj.x === tx && obj.y === ty));
        return { ...m, layers: newLayers, objects: newObjects };
      });
    } else if (tool === 'object') {
      const cfg = OBJECT_CONFIGS[selectedObjectType];
      const id = `obj_${uuidv4().slice(0, 8)}`;
      const newObj: MapObject = {
        id, type: selectedObjectType,
        x: tx, y: ty,
        width: cfg.defaultWidth, height: cfg.defaultHeight,
        label: cfg.label, interactive: cfg.interactive,
      };
      setMap(m => ({ ...m, objects: [...m.objects.filter(o => !(o.x === tx && o.y === ty)), newObj] }));
    } else if (tool === 'spawn') {
      setMap(m => ({ ...m, spawnX: tx, spawnY: ty }));
    } else if (tool === 'select') {
      const clicked = map.objects.find(obj =>
        tx >= obj.x && tx < obj.x + obj.width && ty >= obj.y && ty < obj.y + obj.height
      );
      setSelectedObject(clicked?.id || null);
    }
  }, [tool, selectedTile, selectedLayer, selectedObjectType, map]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || (tool !== 'paint' && tool !== 'erase')) return;
    handleCanvasClick(e);
  }, [isDrawing, tool, handleCanvasClick]);

  const deleteSelectedObject = () => {
    if (!selectedObject) return;
    setMap(m => ({ ...m, objects: m.objects.filter(o => o.id !== selectedObject) }));
    setSelectedObject(null);
  };

  const updateSelectedObjectLabel = (label: string) => {
    setMap(m => ({ ...m, objects: m.objects.map(o => o.id === selectedObject ? { ...o, label } : o) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/rooms/${roomSlug}/map`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          layers: map.layers,
          objects: map.objects,
          spawnX: map.spawnX,
          spawnY: map.spawnY,
          width: map.width,
          height: map.height,
        }),
      });
      onSave(map);
    } finally {
      setSaving(false);
    }
  };

  const selectedObj = map.objects.find(o => o.id === selectedObject);

  return (
    <div style={s.overlay}>
      <div style={s.editor}>
        {/* Toolbar */}
        <div style={s.toolbar}>
          <span style={s.editorTitle}>✏️ Editor de Mapa</span>
          <div style={s.toolGroup}>
            {(['paint', 'erase', 'object', 'spawn', 'select'] as Tool[]).map(t => (
              <button key={t} style={{ ...s.toolBtn, ...(tool === t ? s.toolBtnActive : {}) }}
                onClick={() => setTool(t)} title={t}>
                {t === 'paint' ? '🖌️' : t === 'erase' ? '🧹' : t === 'object' ? '📦' : t === 'spawn' ? '🟢' : '🖱️'}
              </button>
            ))}
          </div>
          <div style={s.toolGroup}>
            <button style={s.zoomBtn} onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>-</button>
            <span style={s.zoomLabel}>{Math.round(zoom * 100)}%</span>
            <button style={s.zoomBtn} onClick={() => setZoom(z => Math.min(3, z + 0.25))}>+</button>
          </div>
          <div style={{ flex: 1 }} />
          <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : '💾 Salvar'}</button>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.workspace}>
          {/* Left panel */}
          <div style={s.panel}>
            {tool === 'paint' && (
              <>
                <div style={s.panelTitle}>Camada</div>
                {map.layers.map((l, i) => (
                  <button key={i} style={{ ...s.layerBtn, ...(selectedLayer === i ? s.layerBtnActive : {}) }}
                    onClick={() => setSelectedLayer(i)}>{l.name}</button>
                ))}
                <div style={s.panelTitle} >Tiles</div>
                <div style={s.tileGrid}>
                  {Object.entries(TILE_TYPES).map(([id, info]) => (
                    <div key={id} title={info.label}
                      style={{ ...s.tileBtn, background: info.color, ...(selectedTile === +id ? s.tileBtnActive : {}) }}
                      onClick={() => setSelectedTile(+id)} />
                  ))}
                </div>
              </>
            )}

            {tool === 'object' && (
              <>
                <div style={s.panelTitle}>Objetos</div>
                {(Object.keys(OBJECT_CONFIGS) as ObjectType[]).map(type => {
                  const cfg = OBJECT_CONFIGS[type];
                  return (
                    <button key={type}
                      style={{ ...s.objectBtn, ...(selectedObjectType === type ? s.objectBtnActive : {}) }}
                      onClick={() => setSelectedObjectType(type)}>
                      <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
                      <span style={s.objectBtnLabel}>{cfg.label}</span>
                    </button>
                  );
                })}
              </>
            )}

            {tool === 'select' && selectedObj && (
              <>
                <div style={s.panelTitle}>Objeto Selecionado</div>
                <div style={s.propRow}>
                  <span style={s.propLabel}>Tipo</span>
                  <span style={s.propValue}>{OBJECT_CONFIGS[selectedObj.type as ObjectType]?.label}</span>
                </div>
                <div style={s.propRow}>
                  <span style={s.propLabel}>Posição</span>
                  <span style={s.propValue}>{selectedObj.x}, {selectedObj.y}</span>
                </div>
                <div style={s.propRow}>
                  <span style={s.propLabel}>Label</span>
                  <input style={s.propInput} value={selectedObj.label}
                    onChange={e => updateSelectedObjectLabel(e.target.value)} />
                </div>
                <button style={s.deleteBtn} onClick={deleteSelectedObject}>🗑️ Deletar</button>
              </>
            )}

            {tool === 'spawn' && (
              <div style={{ padding: 8, color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                Clique no mapa para definir o ponto de entrada dos jogadores.
                <br /><br />
                Atual: ({map.spawnX}, {map.spawnY})
              </div>
            )}
          </div>

          {/* Canvas */}
          <div ref={containerRef} style={s.canvasContainer}>
            <canvas
              ref={canvasRef}
              style={{ cursor: tool === 'paint' || tool === 'erase' ? 'crosshair' : 'default', imageRendering: 'pixelated' }}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseDown={() => setIsDrawing(true)}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  editor: { width: '95vw', height: '92vh', background: '#0f0f1a', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  toolbar: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 },
  editorTitle: { fontWeight: 700, fontSize: 14, color: '#fff', marginRight: 8 },
  toolGroup: { display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 4 },
  toolBtn: { width: 34, height: 34, border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  toolBtnActive: { background: '#4F46E5' },
  zoomBtn: { width: 28, height: 28, border: 'none', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  zoomLabel: { color: '#fff', fontSize: 12, minWidth: 40, textAlign: 'center' },
  saveBtn: { padding: '7px 16px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  closeBtn: { width: 32, height: 32, border: 'none', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 16 },
  workspace: { flex: 1, display: 'flex', overflow: 'hidden' },
  panel: { width: 180, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', padding: 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 },
  panelTitle: { fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, marginBottom: 2 },
  layerBtn: { padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12, textAlign: 'left' },
  layerBtnActive: { background: 'rgba(79,70,229,0.3)', borderColor: '#4F46E5', color: '#fff' },
  tileGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 },
  tileBtn: { width: '100%', aspectRatio: '1', borderRadius: 4, cursor: 'pointer', border: '2px solid transparent' },
  tileBtnActive: { border: '2px solid #fbbf24' },
  objectBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'transparent', cursor: 'pointer', color: '#fff', fontSize: 12 },
  objectBtnActive: { background: 'rgba(79,70,229,0.3)', borderColor: '#4F46E5' },
  objectBtnLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  canvasContainer: { flex: 1, overflow: 'auto', padding: 16 },
  propRow: { display: 'flex', flexDirection: 'column', gap: 2 },
  propLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
  propValue: { fontSize: 13, color: '#fff' },
  propInput: { padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 12, outline: 'none' },
  deleteBtn: { padding: '7px 10px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', fontSize: 12, marginTop: 8 },
};
