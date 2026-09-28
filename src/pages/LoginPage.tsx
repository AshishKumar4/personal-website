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
import { cn } from '@/lib/utils';
import { DISPLAY_TITLE, MONO_LABEL } from '@/components/reading/styles';

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

  const step = phase.name === 'credentials' ? 1 : 2;

  return (
    <PortfolioLayout footer={false}>
      <FlightCanvas />
      <div className="flex min-h-[100svh] items-center justify-center px-5 py-28">
        <div className="relative w-full max-w-[25rem] overflow-hidden rounded-[4px] border border-white/10 bg-background/75 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-signal/70 to-transparent" aria-hidden="true" />
          <div className="p-8 sm:p-10">
            <div className="flex items-center justify-between">
              <Link to="/" className={cn(MONO_LABEL, 'group inline-flex items-center gap-2 text-foreground/50 transition-colors hover:text-foreground')}>
                <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" /> Back to site
              </Link>
              <span className={cn(MONO_LABEL, 'tabular text-foreground/35')}>Step {step} of 2</span>
            </div>
            <div className={cn(MONO_LABEL, 'mt-12 flex items-center gap-2.5 text-foreground/45')}>
              <span className="h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_10px_hsl(var(--signal))]" aria-hidden="true" />
              Admin
            </div>
            <h1 className={cn(DISPLAY_TITLE, 'mt-4 text-[2.5rem] leading-[1]')}>{header.title}</h1>
            <p className="mt-4 font-serif text-[1.0625rem] italic leading-snug text-foreground/60">{header.desc}</p>
            <div className="mt-10">
              {phase.name === 'credentials' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="username" className={cn(MONO_LABEL, 'text-foreground/50')}>Username</Label>
                    <Input id="username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="h-11 rounded-[3px] border-white/15 bg-white/[0.02] font-mono text-[0.9375rem] focus-visible:border-white/35" />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="password" className={cn(MONO_LABEL, 'text-foreground/50')}>Password</Label>
                    <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 rounded-[3px] border-white/15 bg-white/[0.02] font-mono text-[0.9375rem] focus-visible:border-white/35" />
                  </div>
                  <Button type="submit" className="mt-2 h-11 w-full rounded-full bg-foreground font-display text-[0.9375rem] font-[500] text-background [font-stretch:112%] hover:bg-foreground/85" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying</> : 'Continue'}
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
