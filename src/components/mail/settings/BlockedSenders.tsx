import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, ShieldOff, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { isValidEmail } from '@/lib/email-utils';
import { API_ENDPOINTS } from '@/lib/mail-constants';
import { formatThreadDate } from '@/lib/date-utils';
import type { BlockedSender } from '@shared/types';

export function BlockedSenders() {
  const [senders, setSenders] = useState<BlockedSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSenders = useCallback(async () => {
    try {
      const res = await api<{ items: BlockedSender[] }>(API_ENDPOINTS.BLOCKED_SENDERS);
      setSenders(res.items);
    } catch (error) {
      console.error('Failed to fetch blocked senders:', error);
      toast.error('Failed to load blocked senders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSenders();
  }, [fetchSenders]);

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = address.trim().toLowerCase();
    if (!isValidEmail(value)) {
      toast.error('Enter a valid email address');
      return;
    }
    setSubmitting(true);
    try {
      await api<BlockedSender>(API_ENDPOINTS.BLOCKED_SENDERS, {
        method: 'POST',
        body: JSON.stringify({ address: value }),
      });
      toast.success(`Blocked ${value}`);
      setAddress('');
      await fetchSenders();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (sender: BlockedSender) => {
    try {
      await api(API_ENDPOINTS.BLOCKED_SENDER(sender.address), { method: 'DELETE' });
      toast.success(`Unblocked ${sender.address}`);
      setSenders((prev) => prev.filter((s) => s.id !== sender.id));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleBlock} className="flex gap-2">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="spammer@example.com"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" disabled={submitting || !address.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Block
        </Button>
      </form>

      {senders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm">No blocked senders</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sender</TableHead>
              <TableHead className="hidden sm:table-cell">Blocked</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {senders.map((sender) => (
              <TableRow key={sender.id}>
                <TableCell className="font-mono text-xs sm:text-sm">{sender.address}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground whitespace-nowrap">
                  {formatThreadDate(sender.createdAt)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleUnblock(sender)}>
                    <ShieldOff className="h-4 w-4 mr-1" />
                    Unblock
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
