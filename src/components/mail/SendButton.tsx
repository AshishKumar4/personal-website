import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SendButtonProps {
  sending: boolean;
  onClick: () => void;
  size?: 'default' | 'sm';
}

export function SendButton({ sending, onClick, size = 'default' }: SendButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={sending}
      size={size}
      aria-busy={sending}
    >
      <Send className="h-4 w-4 mr-2" />
      {sending ? 'Sending...' : 'Send'}
    </Button>
  );
}
