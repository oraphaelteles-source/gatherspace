import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { getSocket } from '../../hooks/useSocket';

export default function Chat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'global' | 'proximity'>('global');
  const [unread, setUnread] = useState(0);
  const messages = useGameStore(s => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevLen.current && !open) {
      setUnread(u => u + messages.length - prevLen.current);
    }
    prevLen.current = messages.length;
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  const send = () => {
    if (!input.trim()) return;
    getSocket()?.emit('chat_message', { content: input.trim(), type: mode });
    setInput('');
  };

  return (
    <>
      {/* Toggle button */}
      <button style={s.toggle} onClick={() => setOpen(o => !o)}>
        💬
        {unread > 0 && <span style={s.badge}>{unread}</span>}
      </button>

      {open && (
        <div style={s.panel}>
          <div style={s.header}>
            <span style={s.title}>Chat</span>
            <div style={s.tabs}>
              <button style={{ ...s.tab, ...(mode === 'global' ? s.tabActive : {}) }}
                onClick={() => setMode('global')}>Global</button>
              <button style={{ ...s.tab, ...(mode === 'proximity' ? s.tabActive : {}) }}
                onClick={() => setMode('proximity')}>Proximidade</button>
            </div>
            <button style={s.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div style={s.messages}>
            {messages.map(msg => (
              <div key={msg.id} style={s.msg}>
                <span style={{ ...s.msgUser, color: msg.type === 'proximity' ? '#fbbf24' : '#818cf8' }}>
                  {msg.username}
                </span>
                <span style={s.msgText}>{msg.content}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={s.inputRow}>
            <input
              style={s.input}
              placeholder={mode === 'proximity' ? 'Para quem está perto...' : 'Mensagem global...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button style={s.sendBtn} onClick={send}>→</button>
          </div>
        </div>
      )}
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  toggle: { position: 'fixed', bottom: 16, left: 16, width: 44, height: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.7)', cursor: 'pointer', fontSize: 20, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', borderRadius: '50%', fontSize: 10, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  panel: { position: 'fixed', bottom: 70, left: 16, width: 300, height: 380, background: 'rgba(15,15,26,0.95)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', zIndex: 300, backdropFilter: 'blur(20px)' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  title: { fontWeight: 700, fontSize: 13, color: '#fff', flex: 1 },
  tabs: { display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: 2, gap: 2 },
  tab: { padding: '3px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 11 },
  tabActive: { background: '#4F46E5', color: '#fff' },
  closeBtn: { width: 24, height: 24, border: 'none', borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  messages: { flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  msg: { display: 'flex', gap: 6, alignItems: 'flex-start' },
  msgUser: { fontWeight: 600, fontSize: 12, flexShrink: 0 },
  msgText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', wordBreak: 'break-word' },
  inputRow: { display: 'flex', gap: 6, padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  input: { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none' },
  sendBtn: { width: 36, height: 36, borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
