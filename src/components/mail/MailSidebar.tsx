import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Inbox, PenSquare, ChevronDown, Mail, Moon, Sun, Users } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useMailContext } from '@/contexts/MailContext';
import { LABEL_ICONS, MAIL_ROUTES } from '@/lib/mail-constants';
import { getLocalPart } from '@/lib/email-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MailSidebar() {
  const { label = 'inbox' } = useParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { selectedAccount, setSelectedAccount, accounts, labels, loading } = useMailContext();

  const currentAccount = selectedAccount
    ? accounts.find((a) => getLocalPart(a.address) === selectedAccount)
    : null;

  const displayName = currentAccount?.address || 'All Inboxes';
  const systemLabels = labels.filter(l => l.type === 'system');
  const userLabels = labels.filter(l => l.type === 'user');

  return (
    <div className="w-64 border-r border-border flex flex-col bg-card">
      <div className="p-4">
        <Link to="/" className="flex items-center gap-2 mb-4">
          <Mail className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Mail</span>
        </Link>

        <Button
          className="w-full mb-4"
          onClick={() => navigate(MAIL_ROUTES.COMPOSE)}
        >
          <PenSquare className="mr-2 h-4 w-4" />
          Compose
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="truncate">{loading ? 'Loading...' : displayName}</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem
              onClick={() => setSelectedAccount(null)}
              className={cn(!selectedAccount && 'bg-accent')}
            >
              <Users className="h-4 w-4 mr-2" />
              All Inboxes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {accounts.map((account) => {
              const localPart = getLocalPart(account.address);
              return (
                <DropdownMenuItem
                  key={account.address}
                  onClick={() => setSelectedAccount(localPart)}
                  className={cn(selectedAccount === localPart && 'bg-accent')}
                >
                  {account.address}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-2">
          {systemLabels.map((l) => {
            const Icon = LABEL_ICONS[l.id] || Inbox;
            const isActive = label === l.id;
            return (
              <Link
                key={l.id}
                to={MAIL_ROUTES.LABEL(l.id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {l.name}
              </Link>
            );
          })}

          {userLabels.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase">
                Labels
              </div>
              {userLabels.map((l) => (
                <Link
                  key={l.id}
                  to={MAIL_ROUTES.LABEL(l.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    label === l.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: l.color || 'hsl(var(--primary))' }}
                  />
                  {l.name}
                </Link>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      <Separator />
      <div className="p-4 flex items-center justify-between">
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Portfolio
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-8 w-8"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
