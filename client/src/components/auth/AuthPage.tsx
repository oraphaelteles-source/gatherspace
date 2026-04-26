import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const res = await apiFetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro'); return; }
      setAuth({
        id: data.user.id,
        username: data.user.username,
        isAdmin: data.user.isAdmin || false,
        avatarColor: data.user.avatarColor || '#4F46E5',
        avatarEmoji: data.user.avatarEmoji || '😊',
      }, data.token);
      navigate('/');
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.bg}>
      <div style={styles.card}>
        <div style={styles.logo}>🏢</div>
        <h1 style={styles.title}>GatherSpace</h1>
        <p style={styles.subtitle}>Seu escritório virtual</p>

        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }} onClick={() => setMode('login')}>Entrar</button>
          <button style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }} onClick={() => setMode('register')}>Cadastrar</button>
        </div>

        <form onSubmit={handle} style={styles.form}>
          {mode === 'register' && (
            <input style={styles.input} placeholder="Username" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          )}
          <input style={styles.input} type="email" placeholder="E-mail" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <input style={styles.input} type="password" placeholder="Senha" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bg: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  card: {
    background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
    padding: '40px 36px', width: 380, display: 'flex', flexDirection: 'column', alignItems: 'center',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4, marginBottom: 24 },
  tabs: { display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, width: '100%', marginBottom: 20 },
  tab: { flex: 1, padding: '8px 0', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14, fontWeight: 500, background: 'transparent', color: 'rgba(255,255,255,0.5)', transition: 'all .2s' },
  tabActive: { background: '#4F46E5', color: '#fff' },
  form: { width: '100%', display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, outline: 'none',
  },
  error: { color: '#f87171', fontSize: 13, textAlign: 'center', margin: 0 },
  btn: {
    padding: '13px', borderRadius: 10, border: 'none', background: '#4F46E5', color: '#fff',
    fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4, transition: 'background .2s',
  },
};
