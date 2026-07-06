import { useNavigate } from 'react-router-dom';
import { ComposeDialog } from '@/components/mail/ComposeDialog';
import { MAIL_ROUTES } from '@/lib/mail-constants';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useMailContext } from '@/contexts/MailContext';

export function MailComposePage() {
  const navigate = useNavigate();
  const { addresses, selectedAccount, loading } = useMailContext();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ComposeDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) navigate(MAIL_ROUTES.INBOX);
      }}
      addresses={addresses}
      defaultFromAccount={selectedAccount ?? undefined}
    />
  );
}
