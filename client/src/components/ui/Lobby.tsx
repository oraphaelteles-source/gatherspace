import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Room } from '../../types';

export default function Lobby() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [creating, setCreating] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '' });
  const [avatarEmoji, setAvatarEmoji] = useState('');
  const [avatarColor, setAvatarColor] = useState('');
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const logout = useAuthStore(s => s.logout);
  const updateAvatar = useAuthStore(s => s.updateAvatar);
  const navigate = useNavigate();

  const EMOJIS = ['😊','😎','🤓','🧑‍💻','👩‍💼','🧔','👩‍🎨','🦊','🐼','🐸','🚀','⭐'];
  const COLORS = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];

  useEffect(() => {
    if (!user) return;
    setAvatarEmoji(user.avatarEmoji);
    setAvatarColor(user.avatarColor);
    apiFetch('/api/rooms').then(r => r.json()).then(setRooms);
  }, [user]);

  const saveAvatar = async () => {
    await apiFetch('/api/auth/avatar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatarColor, avatarEmoji }),
    });
    updateAvatar(avatarColor, avatarEmoji);
  };

  const createRoom = async () => {
    if (!newRoom.name.trim()) return;
    const res = await apiFetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newRoom),
    });
    const room = await res.json();
    setRooms(r => [...r, room]);
    setCreating(false);
    setNewRoom({ name: '', description: '' });
  };

  return (
    <div style={s.bg}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>🏢 GatherSpace</div>
        <div style={s.userBar}>
          <div style={{ ...s.avatar, background: avatarColor }}>{avatarEmoji}</div>
          <span style={s.username}>{user?.username}</span>
          <button style={s.logoutBtn} onClick={logout}>Sair</button>
        </div>
      </div>

      <div style={s.content}>
        {/* Avatar customizer */}
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Seu Avatar</h3>
          <div style={s.avatarCustom}>
            <div style={{ ...s.bigAvatar, background: avatarColor }}>{avatarEmoji}</div>
            <div style={s.emojiGrid}>
              {EMOJIS.map(e => (
                <button key={e} style={{ ...s.emojiBtn, ...(avatarEmoji === e ? s.emojiBtnActive : {}) }}
                  onClick={() => setAvatarEmoji(e)}>{e}</button>
              ))}
            </div>
            <div style={s.colorGrid}>
              {COLORS.map(c => (
                <button key={c} style={{ ...s.colorBtn, background: c, ...(avatarColor === c ? s.colorBtnActive : {}) }}
                  onClick={() => setAvatarColor(c)} />
              ))}
            </div>
            <button style={s.saveBtn} onClick={saveAvatar}>Salvar Avatar</button>
          </div>
        </div>

        {/* Rooms */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <h3 style={s.sectionTitle}>Salas</h3>
            <button style={s.createBtn} onClick={() => setCreating(true)}>+ Nova Sala</button>
          </div>

          {creating && (
            <div style={s.createForm}>
              <input style={s.input} placeholder="Nome da sala" value={newRoom.name}
                onChange={e => setNewRoom(f => ({ ...f, name: e.target.value }))} />
              <input style={s.input} placeholder="Descrição (opcional)" value={newRoom.description}
                onChange={e => setNewRoom(f => ({ ...f, description: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.saveBtn} onClick={createRoom}>Criar</button>
                <button style={s.cancelBtn} onClick={() => setCreating(false)}>Cancelar</button>
              </div>
            </div>
          )}

          <div style={s.roomGrid}>
            {rooms.map(room => (
              <div key={room.id} style={s.roomCard} onClick={() => navigate(`/room/${room.slug}`)}>
                <div style={s.roomThumb}>{room.name[0]?.toUpperCase()}</div>
                <div style={s.roomInfo}>
                  <div style={s.roomName}>{room.name}</div>
                  <div style={s.roomDesc}>{room.description || 'Sala virtual'}</div>
                </div>
                <div style={s.enterBtn}>Entrar →</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  bg: { minHeight: '100vh', background: '#0f0f1a', color: '#fff', overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' },
  logo: { fontSize: 20, fontWeight: 700, color: '#fff' },
  userBar: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  username: { fontWeight: 500, fontSize: 14 },
  logoutBtn: { padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13 },
  content: { maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 32 },
  section: { background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.07)' },
  sectionTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.8)' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  avatarCustom: { display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  bigAvatar: { width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 },
  emojiGrid: { display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 220 },
  emojiBtn: { width: 36, height: 36, border: '2px solid transparent', borderRadius: 8, background: 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emojiBtnActive: { borderColor: '#4F46E5', background: 'rgba(79,70,229,0.2)' },
  colorGrid: { display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 120 },
  colorBtn: { width: 28, height: 28, border: '2px solid transparent', borderRadius: '50%', cursor: 'pointer' },
  colorBtnActive: { border: '2px solid #fff' },
  saveBtn: { padding: '8px 18px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', fontSize: 13, cursor: 'pointer' },
  createBtn: { padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(79,70,229,0.5)', background: 'rgba(79,70,229,0.15)', color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  createForm: { background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid rgba(255,255,255,0.06)' },
  input: { padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, outline: 'none' },
  roomGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
  roomCard: { display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all .2s' },
  roomThumb: { width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #4F46E5, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 },
  roomInfo: { flex: 1 },
  roomName: { fontWeight: 600, fontSize: 15 },
  roomDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  enterBtn: { color: '#818cf8', fontSize: 13, fontWeight: 600 },
};
