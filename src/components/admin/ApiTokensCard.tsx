import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Copy, Check, Trash2, KeyRound, Plus, Loader2, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatFullDate, formatRelativeTime, formatTimeUntil } from '@/lib/date-utils';
import { getErrorMessage } from '@/lib/error-utils';
import {
  API_TOKEN_TTL_OPTIONS, API_TOKEN_DEFAULT_TTL_MINUTES,
  type ApiTokenPublic, type ApiTokenCreated,
} from '@shared/types';

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getToken()}` };
}

function GeneratedTokenBox({ token, onDone }: { token: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success('Token copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-2 text-sm text-foreground">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <span>Copy this token now — it won&apos;t be shown again.</span>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded bg-background border border-border px-3 py-2 font-mono text-xs">
          {token}
        </code>
        <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy token">
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onDone}>Done</Button>
    </div>
  );
}

export function ApiTokensCard() {
  const [tokens, setTokens] = useState<ApiTokenPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [ttl, setTtl] = useState(String(API_TOKEN_DEFAULT_TTL_MINUTES));
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ApiTokenCreated | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiTokenPublic | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await api<{ items: ApiTokenPublic[] }>('/api/admin/api-tokens', { headers: authHeaders() });
      setTokens(res.items);
    } catch (error) {
      console.error('Failed to load API tokens:', error);
      toast.error('Failed to load API tokens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = await api<ApiTokenCreated>('/api/admin/api-tokens', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: name.trim() || undefined, ttlMinutes: Number(ttl) }),
      });
      setCreated(token);
      setName('');
      setTtl(String(API_TOKEN_DEFAULT_TTL_MINUTES));
      await fetchTokens();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (token: ApiTokenPublic) => {
    try {
      await api(`/api/admin/api-tokens/${token.id}`, { method: 'DELETE', headers: authHeaders() });
      toast.success('Token revoked');
      setTokens((prev) => prev.filter((t) => t.id !== token.id));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card className="bg-card border-border max-w-2xl">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          API Tokens
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Short-lived keys for programmatic access to the content API. They can edit content but
          cannot change your password or manage tokens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {created ? (
          <GeneratedTokenBox token={created.token} onDone={() => setCreated(null)} />
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="token-name" className="text-muted-foreground">Name</Label>
              <Input
                id="token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Claude"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Expires in</Label>
              <Select value={ttl} onValueChange={setTtl}>
                <SelectTrigger className="w-36 bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {API_TOKEN_TTL_OPTIONS.map((o) => (
                    <SelectItem key={o.minutes} value={String(o.minutes)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={creating} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Generate
            </Button>
          </form>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active tokens.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Token</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="hidden md:table-cell">Last used</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">
                    cpk_{t.id}…
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal" title={formatFullDate(t.expiresAt)}>
                      {formatTimeUntil(t.expiresAt)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {t.lastUsedAt ? formatRelativeTime(t.lastUsedAt) : 'never'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Revoke ${t.name}`}
                      onClick={() => setConfirmDelete(t)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke &ldquo;{confirmDelete?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This immediately invalidates the token. Anything using it will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) handleDelete(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
