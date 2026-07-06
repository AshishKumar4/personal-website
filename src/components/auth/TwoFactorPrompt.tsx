import { useState } from 'react';
import { toast } from 'sonner';
import { Fingerprint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { loginPasskey, loginTotp, loginBackup } from '@/lib/two-factor-client';
import { getErrorMessage } from '@/lib/error-utils';

interface TwoFactorPromptProps {
  challengeToken: string;
  methods: { totp: boolean; passkey: boolean; backup: boolean };
  onDone: () => void;
}

export function TwoFactorPrompt({ challengeToken, methods, onDone }: TwoFactorPromptProps) {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  const run = async (fn: () => Promise<unknown>, resetOnError?: () => void) => {
    setBusy(true);
    try {
      await fn();
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
      resetOnError?.();
    } finally {
      setBusy(false);
    }
  };

  if (useBackup) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Enter one of your backup codes.</p>
        <Input
          value={backupCode}
          onChange={(e) => setBackupCode(e.target.value)}
          placeholder="xxxx-xxxx"
          className="font-mono bg-background border-border"
          autoFocus
        />
        <Button className="w-full" disabled={busy || !backupCode.trim()} onClick={() => run(() => loginBackup(challengeToken, backupCode), () => setBackupCode(''))}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
        </Button>
        <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => setUseBackup(false)}>
          Back to other options
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {methods.passkey && (
        <Button type="button" className="w-full" disabled={busy} onClick={() => run(() => loginPasskey(challengeToken))}>
          <Fingerprint className="h-4 w-4 mr-2" /> Use a passkey
        </Button>
      )}
      {methods.passkey && methods.totp && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>
      )}
      {methods.totp && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={(v) => run(() => loginTotp(challengeToken, v), () => setCode(''))} disabled={busy}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>
      )}
      {methods.backup && (
        <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => setUseBackup(true)}>
          Use a backup code instead
        </button>
      )}
    </div>
  );
}
