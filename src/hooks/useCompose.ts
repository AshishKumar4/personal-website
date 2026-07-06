import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { Email, EmailAddress, EmailDraft, AttachmentFile } from '@shared/types';
import { api } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/mail-constants';
import { getErrorMessage } from '@/lib/error-utils';
import {
  generateAttachmentId,
  validateRecipients,
} from '@/lib/email-utils';
import {
  getNewEmailInitialValues,
  getReplyInitialValues,
  getForwardInitialValues,
  getDraftInitialValues,
} from '@/lib/compose-utils';
import { htmlToPlainText } from '@/lib/email-render';

export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';

export interface UseComposeOptions {
  addresses: EmailAddress[];
  defaultFromAccount?: string;
  replyTo?: Email;
  draft?: EmailDraft;
  mode?: ComposeMode;
  onSuccess?: () => void;
}

export interface UseComposeReturn {
  fromAccount: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: AttachmentFile[];
  showCc: boolean;
  showBcc: boolean;
  sending: boolean;

  setFromAccount: (v: string) => void;
  setTo: (v: string) => void;
  setCc: (v: string) => void;
  setBcc: (v: string) => void;
  setSubject: (v: string) => void;
  setBody: (v: string) => void;
  setShowCc: (v: boolean) => void;
  setShowBcc: (v: boolean) => void;

  handleSend: () => Promise<void>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeAttachment: (id: string) => void;
  handleAttachClick: () => void;

  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function useCompose({
  addresses,
  defaultFromAccount,
  replyTo,
  draft,
  mode = 'new',
  onSuccess,
}: UseComposeOptions): UseComposeReturn {
  const initial = (() => {
    if (draft) {
      return getDraftInitialValues(draft, addresses);
    }
    if (mode === 'forward' && replyTo) {
      return getForwardInitialValues(replyTo, addresses, defaultFromAccount);
    }
    if ((mode === 'reply' || mode === 'replyAll') && replyTo) {
      return getReplyInitialValues(replyTo, addresses, mode, defaultFromAccount);
    }
    return getNewEmailInitialValues(addresses, defaultFromAccount);
  })();

  const [fromAccount, setFromAccount] = useState(initial.fromAccount);
  const [to, setTo] = useState(initial.to);
  const [cc, setCc] = useState(initial.cc);
  const [bcc, setBcc] = useState(initial.bcc);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [showCc, setShowCc] = useState(initial.showCc);
  const [showBcc, setShowBcc] = useState(initial.showBcc);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments: AttachmentFile[] = files.map((file) => ({
      file,
      id: generateAttachmentId(),
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSend = useCallback(async () => {
    if (!to.trim()) {
      const msg = mode === 'forward'
        ? 'Please enter a recipient to forward to'
        : 'Please enter a recipient';
      toast.error(msg);
      return;
    }

    const validation = validateRecipients(to);
    if (!validation.valid) {
      toast.error(`Invalid email: ${validation.invalidEmails.join(', ')}`);
      return;
    }

    if (cc.trim()) {
      const ccValidation = validateRecipients(cc);
      if (!ccValidation.valid) {
        toast.error(`Invalid CC email: ${ccValidation.invalidEmails.join(', ')}`);
        return;
      }
    }

    if (bcc.trim()) {
      const bccValidation = validateRecipients(bcc);
      if (!bccValidation.valid) {
        toast.error(`Invalid BCC email: ${bccValidation.invalidEmails.join(', ')}`);
        return;
      }
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('from', fromAccount);
      formData.append('to', to);
      if (cc.trim()) formData.append('cc', cc);
      if (bcc.trim()) formData.append('bcc', bcc);

      formData.append('subject', subject);
      const plainText = htmlToPlainText(body);
      formData.append('body', plainText);
      if (plainText.trim()) formData.append('html', body);

      const inReplyTo = replyTo?.messageId ?? draft?.inReplyTo;
      const threadId = replyTo?.threadId ?? draft?.threadId;
      if (inReplyTo) {
        formData.append('inReplyTo', inReplyTo);
      }
      if (threadId) {
        formData.append('threadId', threadId);
      }

      attachments.forEach((a) => {
        formData.append('attachments', a.file);
      });

      const res = await fetch(API_ENDPOINTS.SEND, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send');
      }

      if (draft) {
        await api(API_ENDPOINTS.DRAFT(draft.id), { method: 'DELETE' }).catch((err) =>
          console.error('Failed to delete sent draft:', err)
        );
      }

      toast.success('Email sent');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  }, [fromAccount, to, cc, bcc, subject, body, attachments, replyTo, draft, mode, onSuccess]);

  return {
    fromAccount,
    to,
    cc,
    bcc,
    subject,
    body,
    attachments,
    showCc,
    showBcc,
    sending,

    setFromAccount,
    setTo,
    setCc,
    setBcc,
    setSubject,
    setBody,
    setShowCc,
    setShowBcc,

    handleSend,
    handleFileChange,
    removeAttachment,
    handleAttachClick,

    fileInputRef,
  };
}
