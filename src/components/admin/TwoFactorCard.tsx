import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, ShieldAlert, Fingerprint, Smartphone, Trash2, Plus, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TotpEnroll } from '@/components/auth/TotpEnroll';
import { BackupCodes } from '@/components/auth/BackupCodes';
import {
  getStatus, registerPasskey, removePasskey, disableTotp, regenerateBackupCodes,
} from '@/lib/two-factor-client';
import { getErrorMessage } from '@/lib/error-utils';
import { formatFullDate } from '@/lib/date-utils';
import type { TwoFactorStatus } from '@shared/types';

export function TwoFactorCard() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [totpDialog, setTotpDialog] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ kind: 'passkey'; id: string; name: string } | { kind: 'totp' } | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getStatus());
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addPasskey = async () => {
    setBusy(true);
    try {
      await registerPasskey({ session: true }, 'Passkey');
      toast.success('Passkey added');
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const doRemove = async () => {
    if (!confirmRemove) return;
    try {
      setStatus(confirmRemove.kind === 'totp' ? await disableTotp() : await removePasskey(confirmRemove.id));
      toast.success('Removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setConfirmRemove(null);
    }
  };

  const regenerate = async () => {
    try {
      setBackupCodes((await regenerateBackupCodes()).codes);
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Card className="bg-card border-border max-w-2xl">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          {status?.enabled ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldAlert className="h-5 w-5 text-yellow-500" />}
          Two-Factor Authentication
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {status?.enabled ? 'Your account is protected by a second factor.' : 'Add a factor to protect your account.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : status ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Fingerprint className="h-4 w-4" /> Passkeys
                </div>
                <Button size="sm" variant="outline" disabled={busy} onClick={addPasskey}>
                  {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add passkey
                </Button>
              </div>
              {status.passkeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No passkeys.</p>
              ) : (
                <ul className="space-y-1.5">
                  {status.passkeys.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span>{p.name} <span className="text-xs text-muted-foreground">· added {formatFullDate(p.createdAt)}</span></span>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Remove passkey" onClick={() => setConfirmRemove({ kind: 'passkey', id: p.id, name: p.name })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Smartphone className="h-4 w-4" /> Authenticator app
                {status.hasTotp && <Badge variant="secondary" className="font-normal">Enabled</Badge>}
              </div>
              {status.hasTotp ? (
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmRemove({ kind: 'totp' })}>Disable</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setTotpDialog(true)}><Plus className="h-4 w-4 mr-1" /> Set up</Button>
              )}
            </div>

            {status.enabled && (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">{status.backupCodesRemaining} backup codes remaining</span>
                <Button size="sm" variant="outline" onClick={regenerate}><RefreshCw className="h-4 w-4 mr-1" /> Regenerate</Button>
              </div>
            )}
          </>
        ) : null}
      </CardContent>

      <Dialog open={totpDialog} onOpenChange={setTotpDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Set up authenticator</DialogTitle></DialogHeader>
          <TotpEnroll auth={{ session: true }} onComplete={() => { setTotpDialog(false); toast.success('Authenticator enabled'); refresh(); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!backupCodes} onOpenChange={(o) => !o && setBackupCodes(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New backup codes</DialogTitle></DialogHeader>
          {backupCodes && <BackupCodes codes={backupCodes} onDone={() => setBackupCodes(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmRemove?.kind === 'totp' ? 'Disable authenticator app?' : `Remove passkey?`}</AlertDialogTitle>
            <AlertDialogDescription>This factor will no longer work for signing in. You can&apos;t remove your last remaining factor.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={doRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
