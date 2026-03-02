import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import birdLogoWhite from '@/assets/bird-logo-white.png';
import { ShaderBackground } from '@/components/ui/digital-aurora';

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
          toast({
            variant: 'destructive',
            title: 'Erro no login',
            description: error.message,
          });
        } else {
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Erro no cadastro',
            description: error.message,
          });
        } else {
          toast({
            title: 'Conta criada!',
            description: 'Você já pode fazer login.',
          });
          setIsLogin(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <ShaderBackground />
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center flex flex-col items-center">
          <img src={birdLogoWhite} alt="Foco Agora" className="h-10 object-contain mb-3 drop-shadow-lg" />
          <p className="mt-2 text-lg text-white drop-shadow-md">
            Foco no que importa.
          </p>
          <p className="text-sm text-white/80 drop-shadow-md">
            Gestão simplificada para seu negócio.
          </p>
        </div>

        <Card className="border-border/50 shadow-lg bg-card/80 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">
              {isLogin ? 'Entrar' : 'Criar conta'}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? 'Entre para acessar seu painel'
                : 'Comece a organizar seu negócio em minutos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLogin
                  ? 'Não tem conta? Criar agora'
                  : 'Já tem conta? Entrar'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
