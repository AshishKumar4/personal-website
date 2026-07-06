import { useOutletContext } from 'react-router-dom';
import type { EmailThread } from '@shared/types';

export interface ThreadListSync {
  patchThread: (id: string, partial: Partial<EmailThread>) => void;
  removeThread: (id: string) => void;
}

export function useThreadListSync(): ThreadListSync {
  return useOutletContext<ThreadListSync | null>() ?? {
    patchThread: () => {},
    removeThread: () => {},
  };
}
