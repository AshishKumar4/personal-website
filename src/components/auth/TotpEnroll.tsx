import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { totpSetup, totpConfirm, type EnrollAuth } from '@/lib/two-factor-client';
import { getErrorMessage } from '@/lib/error-utils';
import type { SessionGrant, TwoFactorStatus } from '@shared/types';

interface TotpEnrollProps {
  auth: EnrollAuth;
  onComplete: (result: SessionGrant | { status: TwoFactorStatus }) => void;
  onCancel?: () => void;
}

export function TotpEnroll({ auth, onComplete, onCancel }: TotpEnrollProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [flowToken, setFlowToken] = useState('');
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await totpSetup(auth);
        if (ignore) return;
        setSecret(res.secret);
        setFlowToken(res.flowToken);
        setQr(await QRCode.toDataURL(res.otpauthUri, { margin: 1, width: 200 }));
      } catch (err) {
        if (!ignore) setError(getErrorMessage(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [auth]);

  const confirm = async () => {
    setConfirming(true);
    try {
      onComplete(await totpConfirm(flowToken, code));
    } catch (err) {
      toast.error(getErrorMessage(err));
      setCode('');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Scan this QR code with your authenticator app (1Password, Authy, Google Authenticator…), then enter the 6-digit code.
      </p>
      <div className="flex justify-center">
        <img src={qr} alt="Authenticator QR code" className="rounded-lg border border-border bg-white p-2" width={200} height={200} />
      </div>
      <button
        type="button"
        className="mx-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => { navigator.clipboard.writeText(secret); toast.success('Secret copied'); }}
      >
        <Copy className="h-3 w-3" /> {secret}
      </button>
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={confirm}>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <div className="flex gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Back</Button>}
        <Button type="button" className="flex-1" disabled={code.length !== 6 || confirming} onClick={confirm}>
          {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & enable'}
        </Button>
      </div>
    </div>
  );
}
