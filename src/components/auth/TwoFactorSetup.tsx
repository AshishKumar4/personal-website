import { useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Smartphone, Loader2, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TotpEnroll } from './TotpEnroll';
import { BackupCodes } from './BackupCodes';
import { registerPasskey, type EnrollAuth } from '@/lib/two-factor-client';
import { getErrorMessage } from '@/lib/error-utils';
import type { SessionGrant, TwoFactorStatus } from '@shared/types';

interface TwoFactorSetupProps {
  setupToken: string;
  onDone: () => void;
}

type Stage = { name: 'choose' } | { name: 'totp' } | { name: 'backup'; codes: string[] };

export function TwoFactorSetup({ setupToken, onDone }: TwoFactorSetupProps) {
  const auth: EnrollAuth = { setupToken };
  const [stage, setStage] = useState<Stage>({ name: 'choose' });
  const [busy, setBusy] = useState(false);

  const handleResult = (result: SessionGrant | { status: TwoFactorStatus }) => {
    if ('token' in result && result.backupCodes) {
      setStage({ name: 'backup', codes: result.backupCodes });
    } else {
      onDone();
    }
  };

  const addPasskey = async () => {
    setBusy(true);
    try {
      handleResult(await registerPasskey(auth, 'Passkey'));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (stage.name === 'backup') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-foreground">Two-factor authentication is on. 🎉</p>
        <BackupCodes codes={stage.codes} onDone={onDone} doneLabel="Continue to dashboard" />
      </div>
    );
  }

  if (stage.name === 'totp') {
    return <TotpEnroll auth={auth} onComplete={handleResult} onCancel={() => setStage({ name: 'choose' })} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Secure your account with a second factor. Add at least one — a passkey (recommended) or an authenticator app.
      </p>
      <Button type="button" className="w-full justify-start h-auto py-3" variant="outline" disabled={busy} onClick={addPasskey}>
        {busy ? <Loader2 className="h-5 w-5 mr-3 animate-spin" /> : <Fingerprint className="h-5 w-5 mr-3 text-primary" />}
        <span className="text-left">
          <span className="block font-medium text-foreground">Add a passkey</span>
          <span className="block text-xs text-muted-foreground">Face ID, Touch ID, or a security key — phishing-resistant</span>
        </span>
      </Button>
      <Button type="button" className="w-full justify-start h-auto py-3" variant="outline" onClick={() => setStage({ name: 'totp' })}>
        <Smartphone className="h-5 w-5 mr-3 text-primary" />
        <span className="text-left">
          <span className="block font-medium text-foreground">Authenticator app</span>
          <span className="block text-xs text-muted-foreground">Rotating 6-digit codes (TOTP)</span>
        </span>
      </Button>
    </div>
  );
}
