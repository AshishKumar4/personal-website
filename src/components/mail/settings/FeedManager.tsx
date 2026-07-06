import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { API_ENDPOINTS, MAIL_ROUTES } from '@/lib/mail-constants';
import { useMailContext } from '@/contexts/MailContext';
import { FeedEditorDialog } from '@/components/mail/FeedEditorDialog';
import type { EmailFeed } from '@shared/types';

function feedSummary(feed: EmailFeed): string {
  const parts: string[] = [];
  if (feed.accountIds.length > 0) {
    parts.push(`${feed.accountIds.length} ${feed.accountIds.length === 1 ? 'address' : 'addresses'}`);
  }
  if (feed.senders.length > 0) {
    parts.push(`${feed.senders.length} ${feed.senders.length === 1 ? 'sender' : 'senders'}`);
  }
  return parts.join(' · ');
}

export function FeedManager() {
  const { feeds, refreshFeeds } = useMailContext();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<EmailFeed | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<EmailFeed | null>(null);

  const openCreate = () => {
    setEditingFeed(undefined);
    setEditorOpen(true);
  };

  const openEdit = (feed: EmailFeed) => {
    setEditingFeed(feed);
    setEditorOpen(true);
  };

  const handleDelete = async (feed: EmailFeed) => {
    try {
      await api(API_ENDPOINTS.FEED(feed.id), { method: 'DELETE' });
      toast.success(`Deleted feed "${feed.name}"`);
      await refreshFeeds();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={openCreate}>
        <Plus className="h-4 w-4 mr-1" />
        New feed
      </Button>

      {feeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Rss className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm">No feeds yet — group your addresses and important senders into virtual inboxes</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {feeds.map((feed) => (
            <Card key={feed.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: feed.color || 'hsl(var(--primary))' }}
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to={MAIL_ROUTES.FEED(feed.id)}
                    className="font-medium hover:text-primary transition-colors truncate block"
                  >
                    {feed.name}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">{feedSummary(feed) || 'Empty feed'}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Edit ${feed.name}`}
                  onClick={() => openEdit(feed)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${feed.name}`}
                  onClick={() => setConfirmDelete(feed)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FeedEditorDialog open={editorOpen} onOpenChange={setEditorOpen} feed={editingFeed} />

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feed "{confirmDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Feeds are just views — no mail is deleted.
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
