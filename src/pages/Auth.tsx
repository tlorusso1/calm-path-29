import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

function safeNext(raw: string | null): string {
  if (!raw) return '/';
  try {
    // must be a same-origin relative path starting with a single '/'
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
    return raw;
  } catch {
    return '/';
  }
}

// ── Win95 helpers ─────────────────────────────────────────────────

const win95 = {
  raised: { border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' } as React.CSSProperties,
  inset:  { border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080' } as React.CSSProperties,
  btn: {
    background: '#C0C0C0',
    border: '2px solid',
    borderColor: '#ffffff #808080 #808080 #ffffff',
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    cursor: 'pointer',
    padding: '3px 10px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '3px 4px',
    fontSize: 13,
    border: '2px solid',
    borderColor: '#808080 #ffffff #ffffff #808080',
    background: 'white',
    fontFamily: "'Courier New', monospace",
    boxSizing: 'border-box' as const,
    outline: 'none',
  } as React.CSSProperties,
};

function TitleBar({ title }: { title: string }) {
  return (
    <div style={{
      background: 'linear-gradient(to right, #000080, #1084d0)',
      padding: '3px 6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <img src="/icons/icon-192.png" style={{ width: 14, height: 14, imageRendering: 'pixelated' }} alt="" />
        <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold', fontFamily: "'Courier New', monospace" }}>
          {title}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {['_', '□', '×'].map((c) => (
          <div key={c} style={{
            width: 16, height: 14, background: '#C0C0C0',
            ...win95.raised,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 'bold', cursor: 'default', lineHeight: 1,
          }}>{c}</div>
        ))}
      </div>
    </div>
  );
}

function Taskbar() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
  useEffect(() => {
    const t = setInterval(() =>
      setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    , 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 30,
      background: '#C0C0C0', borderTop: '2px solid #ffffff',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 4px', zIndex: 100,
    }}>
      <button style={{ ...win95.btn, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'bold' }}>
        <img src="/icons/icon-192.png" style={{ width: 16, height: 16, imageRendering: 'pixelated' }} alt="" />
        Start
      </button>
      <div style={{
        ...win95.inset,
        padding: '2px 8px', fontSize: 12,
        fontFamily: "'Courier New', monospace",
        background: '#C0C0C0',
      }}>
        {time}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ variant: 'destructive', title: 'Erro no login', description: error.message });
        } else {
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast({ variant: 'destructive', title: 'Erro no cadastro', description: error.message });
        } else {
          toast({ title: 'Conta criada!', description: 'Você já pode fazer login.' });
          setIsLogin(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#008080',
      backgroundImage: 'radial-gradient(#006666 1px, transparent 1px)',
      backgroundSize: '4px 4px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Courier New', monospace",
      paddingBottom: 30,
    }}>
      {/* Janela principal */}
      <div style={{
        width: 340,
        background: '#C0C0C0',
        ...win95.raised,
        boxShadow: '3px 3px 0 #000000',
      }}>
        <TitleBar title={`NICE OS — ${isLogin ? 'Entrar' : 'Criar Conta'}`} />

        <div style={{ padding: '16px 16px 12px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <img
              src="/logo-blue.png"
              alt="NICE OS"
              style={{ height: 36, imageRendering: 'pixelated' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 3, fontWeight: 'bold' }}>
                Email:
              </label>
              <input
                type="email"
                value={email}
                placeholder="seu@email.com"
                onChange={(e) => setEmail(e.target.value)}
                required
                style={win95.input}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 3, fontWeight: 'bold' }}>
                Senha:
              </label>
              <input
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={win95.input}
              />
            </div>

            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              <button
                type="submit"
                disabled={loading}
                style={{ ...win95.btn, minWidth: 80, fontWeight: 'bold' }}
              >
                {loading ? '...' : 'OK'}
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                style={{ ...win95.btn, minWidth: 80 }}
              >
                {isLogin ? 'Registrar' : 'Voltar'}
              </button>
            </div>
          </form>

          <div style={{
            marginTop: 12,
            ...win95.inset,
            padding: '2px 6px',
            fontSize: 11,
            color: '#444',
            background: '#C0C0C0',
          }}>
            {isLogin ? 'Pronto' : 'Criação de nova conta'}
          </div>
        </div>
      </div>

      <p style={{
        marginTop: 12,
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: "'Courier New', monospace",
      }}>
        NICE OS v1.0 © 2026 Nice Foods
      </p>

      <Taskbar />
    </div>
  );
};

export default Auth;
