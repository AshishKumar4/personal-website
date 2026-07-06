import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { MAIL_ROUTES } from '@/lib/mail-constants';

export function useMailHotkeys() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  useHotkeys('c', () => navigate(MAIL_ROUTES.COMPOSE), { preventDefault: true });

  useHotkeys('/', () => {
    document.getElementById('mail-search')?.focus();
  }, { preventDefault: true });

  useHotkeys('escape', () => {
    if (params.threadId) {
      const base = params.feedId
        ? MAIL_ROUTES.FEED(params.feedId)
        : MAIL_ROUTES.LABEL(params.label ?? 'inbox');
      navigate(base);
    } else if (location.pathname.startsWith('/mail/settings') || location.pathname.startsWith('/mail/compose')) {
      navigate(MAIL_ROUTES.INBOX);
    }
  });
}
