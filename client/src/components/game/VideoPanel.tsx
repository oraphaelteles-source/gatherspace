import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebRTC, getPeers, getLocalStream } from '../../hooks/useWebRTC';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';

export default function VideoPanel() {
  const [, forceUpdate] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const isMuted = useGameStore(s => s.isMuted);
  const isVideoOff = useGameStore(s => s.isVideoOff);
  const isSharingScreen = useGameStore(s => s.isSharingScreen);
  const toggleMute = useGameStore(s => s.toggleMute);
  const toggleVideo = useGameStore(s => s.toggleVideo);
  const toggleScreenShare = useGameStore(s => s.toggleScreenShare);
  const nearbyPlayers = useGameStore(s => s.nearbyPlayers);
  const players = useGameStore(s => s.players);
  const user = useAuthStore(s => s.user);

  const onPeersChanged = useCallback(() => forceUpdate(n => n + 1), []);
  useWebRTC(onPeersChanged);

  // Set local video stream
  useEffect(() => {
    const stream = getLocalStream();
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  });

  const peers = getPeers();
  const activePeers = [...peers.entries()].filter(([id]) => nearbyPlayers.has(id));

  if (activePeers.length === 0 && nearbyPlayers.size === 0) {
    return (
      <div style={s.idle}>
        <span style={s.idleIcon}>👥</span>
        <span style={s.idleText}>Aproxime-se de alguém para iniciar chamada</span>
      </div>
    );
  }

  return (
    <div style={s.panel}>
      {/* Local video */}
      <div style={s.videoCard}>
        <video ref={localVideoRef} autoPlay muted playsInline
          style={{ ...s.video, ...(isVideoOff ? s.videoOff : {}) }} />
        {isVideoOff && <div style={s.videoOffOverlay}>{user?.avatarEmoji || '😊'}</div>}
        <div style={s.nameTag}>{user?.username} (você)</div>
      </div>

      {/* Remote peers */}
      {activePeers.map(([id, peer]) => {
        const player = players.get(id);
        return (
          <div key={id} style={s.videoCard}>
            <RemoteVideo videoEl={peer.videoEl} />
            <div style={s.nameTag}>{player?.username || 'Usuário'}</div>
          </div>
        );
      })}

      {/* Controls */}
      <div style={s.controls}>
        <button style={{ ...s.ctrl, ...(isMuted ? s.ctrlOff : {}) }} onClick={toggleMute} title={isMuted ? 'Ativar mic' : 'Silenciar'}>
          {isMuted ? '🔇' : '🎙️'}
        </button>
        <button style={{ ...s.ctrl, ...(isVideoOff ? s.ctrlOff : {}) }} onClick={toggleVideo} title={isVideoOff ? 'Ligar câmera' : 'Desligar câmera'}>
          {isVideoOff ? '📷' : '📹'}
        </button>
        <button style={{ ...s.ctrl, ...(isSharingScreen ? s.ctrlActive : {}) }} onClick={toggleScreenShare} title="Compartilhar tela">
          🖥️
        </button>
      </div>
    </div>
  );
}

function RemoteVideo({ videoEl }: { videoEl: HTMLVideoElement }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'cover';
      videoEl.style.borderRadius = '8px';
      ref.current.appendChild(videoEl);
    }
    return () => { videoEl.remove(); };
  }, [videoEl]);
  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}

const s: Record<string, React.CSSProperties> = {
  panel: { position: 'fixed', bottom: 80, right: 12, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 200, alignItems: 'flex-end' },
  idle: { position: 'fixed', bottom: 80, right: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '8px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  idleIcon: { fontSize: 16 },
  idleText: {},
  videoCard: { width: 140, height: 100, borderRadius: 10, overflow: 'hidden', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  videoOff: { opacity: 0 },
  videoOffOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, background: '#1a1a2e' },
  nameTag: { position: 'absolute', bottom: 4, left: 6, fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 5px', borderRadius: 4 },
  controls: { display: 'flex', gap: 6, justifyContent: 'flex-end' },
  ctrl: { width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ctrlOff: { background: 'rgba(239,68,68,0.3)', borderColor: '#ef4444' },
  ctrlActive: { background: 'rgba(16,185,129,0.3)', borderColor: '#10b981' },
};
