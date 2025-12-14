import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposeDialog } from '@/components/mail/ComposeDialog';
import { api } from '@/lib/api-client';
import { MAIL_ROUTES, API_ENDPOINTS } from '@/lib/mail-constants';
import type { EmailAccount } from '@shared/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function MailComposePage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api<{ accounts: EmailAccount[] }>(API_ENDPOINTS.ACCOUNTS);
        setAccounts(res.accounts);
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  const handleClose = () => {
    navigate(MAIL_ROUTES.INBOX);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ComposeDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      accounts={accounts}
    />
  );
}
