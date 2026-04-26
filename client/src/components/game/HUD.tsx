import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';

interface Props {
  roomName: string;
  onOpenEditor: () => void;
  playerCount: number;
}

export default function HUD({ roomName, onOpenEditor, playerCount }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const players = useGameStore(s => s.players);
  const nearbyPlayers = useGameStore(s => s.nearbyPlayers);
  const isMuted = useGameStore(s => s.isMuted);
  const isVideoOff = useGameStore(s => s.isVideoOff);
  const toggleMute = useGameStore(s => s.toggleMute);
  const toggleVideo = useGameStore(s => s.toggleVideo);
  const toggleScreenShare = useGameStore(s => s.toggleScreenShare);
  const isSharingScreen = useGameStore(s => s.isSharingScreen);

  return (
    <>
      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.roomInfo}>
          <span style={s.roomName}>{roomName}</span>
          <span style={s.playerCount}>👥 {playerCount + 1} online</span>
        </div>
        <div style={s.topActions}>
          {user?.isAdmin && (
            <button style={s.editBtn} onClick={onOpenEditor} title="Editar mapa">
              ✏️ Editar Mapa
            </button>
          )}
          <button style={s.leaveBtn} onClick={() => navigate('/')} title="Sair da sala">
            ← Sair
          </button>
        </div>
      </div>

      {/* Bottom center controls */}
      <div style={s.bottomBar}>
        <button style={{ ...s.ctrl, ...(isMuted ? s.ctrlDanger : {}) }} onClick={toggleMute} title={isMuted ? 'Ativar microfone' : 'Silenciar'}>
          {isMuted ? '🔇' : '🎙️'}
          <span style={s.ctrlLabel}>{isMuted ? 'Mudo' : 'Mic'}</span>
        </button>
        <button style={{ ...s.ctrl, ...(isVideoOff ? s.ctrlDanger : {}) }} onClick={toggleVideo} title={isVideoOff ? 'Ligar câmera' : 'Desligar câmera'}>
          {isVideoOff ? '📷' : '📹'}
          <span style={s.ctrlLabel}>{isVideoOff ? 'Câm. off' : 'Câmera'}</span>
        </button>
        <button style={{ ...s.ctrl, ...(isSharingScreen ? s.ctrlSuccess : {}) }} onClick={toggleScreenShare} title="Compartilhar tela">
          🖥️
          <span style={s.ctrlLabel}>{isSharingScreen ? 'Parar' : 'Tela'}</span>
        </button>
        {nearbyPlayers.size > 0 && (
          <div style={s.nearbyBadge}>
            🔔 {nearbyPlayers.size} pessoa{nearbyPlayers.size > 1 ? 's' : ''} por perto
          </div>
        )}
      </div>

      {/* Key hints */}
      <div style={s.hints}>
        <span style={s.hint}>WASD / ↑↓←→ mover</span>
        <span style={s.hint}>E interagir</span>
      </div>

      {/* Players list */}
      <div style={s.playersList}>
        <div style={s.playersTitle}>Na sala</div>
        <div style={{ ...s.playerItem, background: 'rgba(79,70,229,0.15)' }}>
          <div style={{ ...s.playerDot, background: user?.avatarColor }}>{user?.avatarEmoji}</div>
          <span style={s.playerName}>{user?.username} (você)</span>
        </div>
        {[...players.values()].map(p => (
          <div key={p.id} style={s.playerItem}>
            <div style={{ ...s.playerDot, background: p.avatarColor }}>{p.avatarEmoji}</div>
            <span style={s.playerName}>{p.username}</span>
            {nearbyPlayers.has(p.id) && <span style={s.nearIcon}>🔊</span>}
          </div>
        ))}
      </div>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  topBar: { position: 'fixed', top: 0, left: 0, right: 0, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', zIndex: 200 },
  roomInfo: { display: 'flex', alignItems: 'center', gap: 12 },
  roomName: { fontWeight: 700, fontSize: 15, color: '#fff' },
  playerCount: { fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 20 },
  topActions: { display: 'flex', gap: 8 },
  editBtn: { padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  leaveBtn: { padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12 },
  bottomBar: { position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(15,15,26,0.9)', borderRadius: 16, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 200, backdropFilter: 'blur(20px)' },
  ctrl: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', minWidth: 54, color: '#fff' },
  ctrlLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  ctrlDanger: { background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' },
  ctrlSuccess: { background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' },
  nearbyBadge: { fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(16,185,129,0.2)' },
  hints: { position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12, zIndex: 100 },
  hint: { fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: 6 },
  playersList: { position: 'fixed', top: 60, right: 12, width: 160, background: 'rgba(15,15,26,0.85)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', padding: '10px 0', zIndex: 200, backdropFilter: 'blur(16px)' },
  playersTitle: { fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, padding: '0 12px', marginBottom: 6 },
  playerItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px' },
  playerDot: { width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 },
  playerName: { fontSize: 12, color: 'rgba(255,255,255,0.8)', flex: 1 },
  nearIcon: { fontSize: 12 },
};
