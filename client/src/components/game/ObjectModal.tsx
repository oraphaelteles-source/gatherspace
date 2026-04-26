import { useState } from 'react';
import { MapObject, OBJECT_CONFIGS, ObjectType } from '../../types';

interface Props {
  object: MapObject;
  onClose: () => void;
}

export default function ObjectModal({ object, onClose }: Props) {
  const [whiteboardText, setWhiteboardText] = useState('');
  const cfg = OBJECT_CONFIGS[object.type as ObjectType];

  const renderContent = () => {
    switch (object.type) {
      case 'whiteboard':
        return (
          <div style={s.whiteboard}>
            <textarea
              style={s.whiteboardArea}
              placeholder="Escreva aqui... (compartilhado com todos na sala)"
              value={whiteboardText}
              onChange={e => setWhiteboardText(e.target.value)}
            />
          </div>
        );
      case 'tv':
        return (
          <div style={s.tvContainer}>
            <p style={s.hint}>Cole um link do YouTube ou URL de vídeo:</p>
            <input style={s.urlInput} placeholder="https://youtube.com/watch?v=..." />
            <button style={s.playBtn}>▶ Reproduzir</button>
          </div>
        );
      case 'meeting_table':
        return (
          <div style={s.meetingInfo}>
            <div style={s.meetingIcon}>📋</div>
            <p style={s.meetingText}>Você entrou na área de reunião.</p>
            <p style={s.meetingSubtext}>O vídeo e áudio estão ativos com todos na mesma área.</p>
          </div>
        );
      case 'coffee_machine':
        return (
          <div style={s.meetingInfo}>
            <div style={s.meetingIcon}>☕</div>
            <p style={s.meetingText}>Hora do café! ☕</p>
            <p style={s.meetingSubtext}>Bate-papo informal com quem estiver por perto.</p>
          </div>
        );
      default:
        return (
          <div style={s.meetingInfo}>
            <div style={s.meetingIcon}>{cfg?.emoji || '📦'}</div>
            <p style={s.meetingText}>{object.label || cfg?.label}</p>
          </div>
        );
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.headerEmoji}>{cfg?.emoji}</span>
          <span style={s.headerTitle}>{object.label || cfg?.label}</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={s.body}>{renderContent()}</div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#0f0f1a', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', width: 480, maxWidth: '90vw', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  headerEmoji: { fontSize: 22 },
  headerTitle: { flex: 1, fontWeight: 700, fontSize: 15, color: '#fff' },
  closeBtn: { width: 28, height: 28, border: 'none', borderRadius: 7, background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 13 },
  body: { padding: 18 },
  whiteboard: { width: '100%' },
  whiteboardArea: { width: '100%', height: 200, background: '#fff', borderRadius: 8, border: 'none', padding: 12, fontSize: 14, color: '#222', resize: 'vertical', outline: 'none', boxSizing: 'border-box' },
  tvContainer: { display: 'flex', flexDirection: 'column', gap: 10 },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 },
  urlInput: { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none' },
  playBtn: { padding: '10px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  meetingInfo: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '10px 0' },
  meetingIcon: { fontSize: 48 },
  meetingText: { fontWeight: 600, fontSize: 16, color: '#fff', margin: 0, textAlign: 'center' },
  meetingSubtext: { color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0, textAlign: 'center' },
};
