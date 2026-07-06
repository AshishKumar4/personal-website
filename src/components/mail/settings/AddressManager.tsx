import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Trash2, Ghost, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { API_ENDPOINTS, KIND_META } from '@/lib/mail-constants';
import { useMailContext } from '@/contexts/MailContext';
import { useThrowaway } from '@/hooks/useThrowaway';
import { normalizeLocalPart, validateLocalPart } from '@shared/address-validation';
import { EMAIL_DOMAIN } from '@shared/types';
import type { EmailAddress, EmailAddressKind } from '@shared/types';
import { formatThreadDate } from '@/lib/date-utils';

const KIND_BADGE_VARIANT: Record<EmailAddressKind, 'default' | 'secondary' | 'outline'> = {
  primary: 'default',
  custom: 'secondary',
  throwaway: 'outline',
};

function CreateAddressForm() {
  const { refreshAddresses } = useMailContext();
  const { createThrowaway, creating } = useThrowaway();
  const [localPart, setLocalPart] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const normalized = normalizeLocalPart(localPart);
  const validationError = normalized ? validateLocalPart(normalized) : null;
  const canSubmit = normalized.length > 0 && !validationError && !submitting;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await api<EmailAddress>(API_ENDPOINTS.ADDRESSES, {
        method: 'POST',
        body: JSON.stringify({
          kind: 'custom',
          localPart: normalized,
          name: name.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      toast.success(`Created ${created.address}`);
      setLocalPart('');
      setName('');
      setNote('');
      await refreshAddresses();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">New address</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-local-part">Address</Label>
              <div className="flex items-center">
                <Input
                  id="new-local-part"
                  value={localPart}
                  onChange={(e) => setLocalPart(e.target.value.toLowerCase())}
                  placeholder="newsletters"
                  className={cn('rounded-r-none', validationError && 'border-destructive')}
                  autoComplete="off"
                />
                <span className="h-9 flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-sm text-muted-foreground whitespace-nowrap">
                  @{EMAIL_DOMAIN}
                </span>
              </div>
              {validationError && (
                <p className="text-xs text-destructive">{validationError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Display name</Label>
              <Input
                id="new-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Newsletters"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-note">Note</Label>
            <Input
              id="new-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is this address for?"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={!canSubmit}>
              <Plus className="h-4 w-4 mr-1" />
              {submitting ? 'Creating...' : 'Create address'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={creating}
              onClick={() => createThrowaway()}
            >
              <Ghost className="h-4 w-4 mr-1" />
              {creating ? 'Generating...' : 'Generate throwaway'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AddressManager() {
  const { addresses, refreshAddresses } = useMailContext();
  const [confirmSuppress, setConfirmSuppress] = useState<EmailAddress | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EmailAddress | null>(null);

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const setStatus = async (address: EmailAddress, status: 'active' | 'suppressed') => {
    try {
      await api<EmailAddress>(API_ENDPOINTS.ADDRESS(address.id), {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      toast.success(status === 'suppressed' ? `${address.address} suppressed` : `${address.address} re-activated`);
      await refreshAddresses();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const deleteAddress = async (address: EmailAddress) => {
    try {
      await api(API_ENDPOINTS.ADDRESS(address.id), { method: 'DELETE' });
      toast.success(`Deleted ${address.address}`);
      await refreshAddresses();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        <CreateAddressForm />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="hidden md:table-cell">Note</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {addresses.map((address) => {
              const isPrimary = address.kind === 'primary';
              const suppressed = address.status === 'suppressed';
              return (
                <TableRow key={address.id} className={cn(suppressed && 'opacity-60')}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm">
                      <span className="truncate">{address.address}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        aria-label={`Copy ${address.address}`}
                        onClick={() => copyAddress(address.address)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {address.name !== address.id && (
                      <div className="text-xs text-muted-foreground">{address.name}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={KIND_BADGE_VARIANT[address.kind]} className="font-normal">
                      {KIND_META[address.kind].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Switch
                            checked={!suppressed}
                            disabled={isPrimary}
                            aria-label={suppressed ? 'Re-activate address' : 'Suppress address'}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setStatus(address, 'active');
                              } else {
                                setConfirmSuppress(address);
                              }
                            }}
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isPrimary
                          ? 'Primary addresses cannot be suppressed'
                          : suppressed
                            ? 'Suppressed — incoming mail is silently dropped'
                            : 'Active — receiving mail'}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-48 truncate">
                    {address.note || '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                    {address.createdAt ? formatThreadDate(address.createdAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={isPrimary}
                            aria-label={`Delete ${address.address}`}
                            onClick={() => setConfirmDelete(address)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isPrimary ? 'Primary addresses cannot be deleted' : 'Delete address'}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirmSuppress} onOpenChange={(open) => !open && setConfirmSuppress(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suppress {confirmSuppress?.address}?</AlertDialogTitle>
            <AlertDialogDescription>
              Incoming mail to this address will be silently dropped — nothing is stored and the
              sender gets no bounce. You can re-activate it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmSuppress) setStatus(confirmSuppress, 'suppressed');
                setConfirmSuppress(null);
              }}
            >
              Suppress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.address}?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing mail history remains, but this address can no longer send or receive —
              future mail to it bounces. If you just want it to go quiet, suppress it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) deleteAddress(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
