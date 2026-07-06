import { useOutletContext } from 'react-router-dom';
import type { EmailThread } from '@shared/types';

export interface ThreadListSync {
  patchThread: (id: string, partial: Partial<EmailThread>) => void;
  removeThread: (id: string) => void;
}

const NOOP_SYNC: ThreadListSync = {
  patchThread: () => {},
  removeThread: () => {},
};

export function useThreadListSync(): ThreadListSync {
  return useOutletContext<ThreadListSync | null>() ?? NOOP_SYNC;
}
