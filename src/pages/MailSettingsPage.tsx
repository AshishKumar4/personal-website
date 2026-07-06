import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MAIL_ROUTES } from '@/lib/mail-constants';
import { AddressManager } from '@/components/mail/settings/AddressManager';
import { FeedManager } from '@/components/mail/settings/FeedManager';
import { BlockedSenders } from '@/components/mail/settings/BlockedSenders';

const TABS = ['addresses', 'feeds', 'blocked'] as const;
type SettingsTab = typeof TABS[number];

function isSettingsTab(value: string | undefined): value is SettingsTab {
  return TABS.includes(value as SettingsTab);
}

export function MailSettingsPage() {
  const { tab } = useParams();
  const navigate = useNavigate();

  if (!isSettingsTab(tab)) {
    return <Navigate to={MAIL_ROUTES.SETTINGS('addresses')} replace />;
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to inbox"
            onClick={() => navigate(MAIL_ROUTES.INBOX)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Mail settings</h1>
        </div>

        <Tabs value={tab} onValueChange={(value) => navigate(MAIL_ROUTES.SETTINGS(value as SettingsTab))}>
          <TabsList>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="feeds">Feeds</TabsTrigger>
            <TabsTrigger value="blocked">Blocked senders</TabsTrigger>
          </TabsList>
          <TabsContent value="addresses" className="mt-6">
            <AddressManager />
          </TabsContent>
          <TabsContent value="feeds" className="mt-6">
            <FeedManager />
          </TabsContent>
          <TabsContent value="blocked" className="mt-6">
            <BlockedSenders />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
