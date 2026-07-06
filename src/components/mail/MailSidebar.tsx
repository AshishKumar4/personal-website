import { useState } from 'react';
import { Link, useNavigate, useMatch } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Inbox, PenSquare, Mail, Moon, Sun, Users, Plus, Pencil,
  Ghost, Settings2, BellOff, Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/contexts/ThemeContext';
import { useMailContext } from '@/contexts/MailContext';
import { useThrowaway } from '@/hooks/useThrowaway';
import { LABEL_ICONS, KIND_META, MAIL_ROUTES } from '@/lib/mail-constants';
import { SidebarNavItem } from './SidebarNavItem';
import { FeedEditorDialog } from './FeedEditorDialog';
import type { EmailFeed } from '@shared/types';

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 pt-4 pb-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      {action}
    </div>
  );
}

export function MailSidebar() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { selectedAccount, setSelectedAccount, addresses, labels, feeds, stats, loading } = useMailContext();
  const { createThrowaway, creating } = useThrowaway();
  const [feedEditorOpen, setFeedEditorOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<EmailFeed | undefined>(undefined);

  const feedMatch = useMatch('/mail/feeds/:feedId/*');
  const labelMatch = useMatch('/mail/:label/*');
  const activeFeedId = feedMatch?.params.feedId;
  const rawLabel = labelMatch?.params.label;
  const inSpecialView = Boolean(activeFeedId) || rawLabel === 'settings' || rawLabel === 'compose' || rawLabel === 'feeds';
  const activeLabel = inSpecialView ? null : rawLabel ?? 'inbox';

  const isInboxView = activeLabel === 'inbox';
  const systemLabels = labels.filter((l) => l.type === 'system');
  const userLabels = labels.filter((l) => l.type === 'user');

  const selectAccount = (account: string | null) => {
    setSelectedAccount(account);
    navigate(MAIL_ROUTES.INBOX);
  };

  const copyAddress = async (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const openFeedEditor = (feed?: EmailFeed) => {
    setEditingFeed(feed);
    setFeedEditorOpen(true);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-64 h-full border-r border-border flex flex-col bg-card">
        <div className="p-4 pb-2">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <Mail className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Mail</span>
          </Link>

          <Button className="w-full" onClick={() => navigate(MAIL_ROUTES.COMPOSE)}>
            <PenSquare className="mr-2 h-4 w-4" />
            Compose
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 pb-2">
            <SectionHeader label="Inboxes" />
            <SidebarNavItem
              onClick={() => selectAccount(null)}
              icon={Users}
              label="All Inboxes"
              badge={stats?.labels.inbox}
              active={isInboxView && !selectedAccount}
            />
            {loading && addresses.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
            )}
            {addresses.map((address) => {
              const suppressed = address.status === 'suppressed';
              return (
                <SidebarNavItem
                  key={address.id}
                  onClick={() => selectAccount(address.id)}
                  icon={KIND_META[address.kind].icon}
                  label={address.id}
                  badge={stats?.accounts[address.id]}
                  active={isInboxView && selectedAccount === address.id}
                  muted={suppressed}
                  trailing={
                    <span className="flex items-center gap-1 shrink-0">
                      {suppressed && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <BellOff className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>Suppressed — incoming mail is dropped</TooltipContent>
                        </Tooltip>
                      )}
                      {address.kind === 'throwaway' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              role="button"
                              tabIndex={-1}
                              aria-label={`Copy ${address.address}`}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted-foreground/10"
                              onClick={(e) => copyAddress(address.address, e)}
                            >
                              <Copy className="h-3 w-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Copy address</TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  }
                />
              );
            })}

            <SectionHeader
              label="Feeds"
              action={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  aria-label="New feed"
                  onClick={() => openFeedEditor()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              }
            />
            {feeds.map((feed) => (
              <SidebarNavItem
                key={feed.id}
                to={MAIL_ROUTES.FEED(feed.id)}
                dotColor={feed.color || 'hsl(var(--primary))'}
                label={feed.name}
                active={activeFeedId === feed.id}
                trailing={
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Edit ${feed.name}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted-foreground/10 shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openFeedEditor(feed);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </span>
                }
              />
            ))}

            <SectionHeader label="Labels" />
            {systemLabels.map((l) => (
              <SidebarNavItem
                key={l.id}
                to={MAIL_ROUTES.LABEL(l.id)}
                icon={LABEL_ICONS[l.id] || Inbox}
                label={l.name}
                badge={l.id === 'spam' ? stats?.labels.spam : undefined}
                active={activeLabel === l.id && (l.id !== 'inbox' || !selectedAccount)}
              />
            ))}
            {userLabels.length > 0 && (
              <>
                <Separator className="my-2" />
                {userLabels.map((l) => (
                  <SidebarNavItem
                    key={l.id}
                    to={MAIL_ROUTES.LABEL(l.id)}
                    dotColor={l.color || 'hsl(var(--primary))'}
                    label={l.name}
                    active={activeLabel === l.id}
                  />
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        <Separator />
        <div className="p-3 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={creating}
            onClick={() => createThrowaway()}
          >
            <Ghost className="mr-2 h-4 w-4" />
            {creating ? 'Generating...' : 'New throwaway'}
          </Button>
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; Portfolio
            </Link>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Mail settings"
                    onClick={() => navigate(MAIL_ROUTES.SETTINGS())}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mail settings</TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <FeedEditorDialog open={feedEditorOpen} onOpenChange={setFeedEditorOpen} feed={editingFeed} />
      </div>
    </TooltipProvider>
  );
}
