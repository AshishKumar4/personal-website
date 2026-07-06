import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toaster, toast } from '@/components/ui/sonner';
import { login } from '@/lib/two-factor-client';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { TwoFactorPrompt } from '@/components/auth/TwoFactorPrompt';
import { getErrorMessage } from '@/lib/error-utils';
import type { LoginStep } from '@shared/types';
import { Loader2 } from 'lucide-react';

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
    toast.success('Login successful!');
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
    ? { title: 'Set up two-factor auth', desc: 'One-time setup to secure your account.' }
    : phase.name === '2fa'
      ? { title: 'Verify your identity', desc: 'Complete the second step to sign in.' }
      : { title: 'Admin Login', desc: 'Enter your credentials to access the dashboard.' };

  return (
    <PortfolioLayout>
      <main className="relative z-10 flex items-center justify-center min-h-screen py-24">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="w-full max-w-sm bg-card border-border">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-foreground font-display">{header.title}</CardTitle>
              <CardDescription className="text-muted-foreground">{header.desc}</CardDescription>
            </CardHeader>
            {phase.name === 'credentials' && (
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-muted-foreground">Username</Label>
                    <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="bg-background border-border text-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-muted-foreground">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-background border-border text-foreground" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging in...</> : 'Login'}
                  </Button>
                </CardFooter>
              </form>
            )}
            {phase.name === 'setup' && (
              <CardContent><TwoFactorSetup setupToken={phase.setupToken} onDone={enterAdmin} /></CardContent>
            )}
            {phase.name === '2fa' && (
              <CardContent><TwoFactorPrompt challengeToken={phase.challengeToken} methods={phase.methods} onDone={enterAdmin} /></CardContent>
            )}
          </Card>
        </motion.div>
      </main>
      <Toaster />
    </PortfolioLayout>
  );
}