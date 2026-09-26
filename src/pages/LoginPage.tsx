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
import { FlightCanvas } from '@/components/flight/FlightCanvas';
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
    ? { title: 'Set up two-factor', desc: 'One-time setup to secure your account.' }
    : phase.name === '2fa'
      ? { title: 'Verify it’s you', desc: 'Complete the second factor to sign in.' }
      : { title: 'Sign in', desc: 'Admin access for ashishkumarsingh.com.' };

  return (
    <PortfolioLayout footer={false}>
      <FlightCanvas />
      <div className="flex min-h-[100svh] items-center justify-center px-5 py-28">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-background/70 p-8 backdrop-blur-xl">
          <Link to="/" className="group inline-flex items-center gap-2 text-[0.875rem] text-foreground/55 hover:text-foreground">
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" /> Back to site
          </Link>
          <h1 className="mt-10 font-display text-[2.4rem] font-[520] leading-none tracking-[-0.04em] text-foreground">{header.title}</h1>
          <p className="mt-3 text-[0.9375rem] text-foreground/55">{header.desc}</p>
          <div className="mt-8">
            {phase.name === 'credentials' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-[0.8125rem] text-foreground/60">Username</Label>
                  <Input id="username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="h-11 bg-transparent" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[0.8125rem] text-foreground/60">Password</Label>
                  <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 bg-transparent" />
                </div>
                <Button type="submit" className="h-11 w-full rounded-full bg-foreground text-background hover:bg-foreground/85" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying</> : 'Continue'}
                </Button>
              </form>
            )}
            {phase.name === 'setup' && <TwoFactorSetup setupToken={phase.setupToken} onDone={enterAdmin} />}
            {phase.name === '2fa' && <TwoFactorPrompt challengeToken={phase.challengeToken} methods={phase.methods} onDone={enterAdmin} />}
          </div>
        </div>
      </div>
      <Toaster />
    </PortfolioLayout>
  );
}
