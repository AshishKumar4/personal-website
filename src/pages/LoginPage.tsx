import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toaster, toast } from '@/components/ui/sonner';
import { login } from '@/lib/two-factor-client';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { TwoFactorPrompt } from '@/components/auth/TwoFactorPrompt';
import { getErrorMessage } from '@/lib/error-utils';
import { ScrollField } from '@/components/diffusion/ScrollField';
import type { LoginStep } from '@shared/types';

type Phase =
  | { name: 'credentials' }
  | { name: 'setup'; setupToken: string }
  | { name: '2fa'; challengeToken: string; methods: { totp: boolean; passkey: boolean; backup: boolean } };

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: 'credentials' });
  const navigate = useNavigate();

  const enterAdmin = () => {
    toast.success('Welcome back.');
    navigate('/admin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const step: LoginStep = await login(username, password);
      if (step.step === 'setup') {
        setPhase({ name: 'setup', setupToken: step.setupToken });
      } else {
        setPhase({ name: '2fa', challengeToken: step.challengeToken, methods: step.methods });
      }
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const header = phase.name === 'setup'
    ? { title: 'Set up two-factor', desc: 'One-time setup to secure your account.', step: '02' }
    : phase.name === '2fa'
      ? { title: 'Verify it’s you', desc: 'Complete the second factor to sign in.', step: '02' }
      : { title: 'Authenticate', desc: 'Only one person has the weights for this.', step: '01' };

  return (
    <PortfolioLayout footer={false}>
      <div className="grid min-h-[100svh] grid-cols-1 lg:grid-cols-12">
        <div className="relative hidden border-r border-line/10 lg:col-span-7 lg:block">
          <div className="absolute inset-0 pt-16">
            <ScrollField text="Admin" sampleOnMount seed={4242} />
          </div>
          <div className="absolute bottom-8 left-12 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            restricted · passkeys, totp and backup codes
          </div>
        </div>
        <div className="flex items-center justify-center px-5 pb-16 pt-28 sm:px-8 lg:col-span-5 lg:px-16 lg:pt-16">
          <div className="w-full max-w-sm">
            <Link to="/" className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
              <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-1" /> Back to site
            </Link>
            <div className="mt-12 font-mono text-[10px] uppercase tracking-[0.18em] text-signal">Step {header.step}</div>
            <h1 className="mt-3 font-display text-6xl leading-none tracking-[-0.02em] text-foreground">{header.title}</h1>
            <p className="mt-4 text-sm text-muted-foreground">{header.desc}</p>
            <div className="mt-10">
              {phase.name === 'credentials' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Username</Label>
                    <Input id="username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Password</Label>
                    <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
                  </div>
                  <Button type="submit" className="h-12 w-full rounded-full font-mono text-[11px] uppercase tracking-[0.14em]" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : 'Continue'}
                  </Button>
                </form>
              )}
              {phase.name === 'setup' && <TwoFactorSetup setupToken={phase.setupToken} onDone={enterAdmin} />}
              {phase.name === '2fa' && <TwoFactorPrompt challengeToken={phase.challengeToken} methods={phase.methods} onDone={enterAdmin} />}
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </PortfolioLayout>
  );
}
