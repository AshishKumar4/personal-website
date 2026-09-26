import React, { useState } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { PERSONAL_INFO, SOCIAL_LINKS } from '@/components/config/constants';
import { Reveal } from '@/components/site/Reveal';
import { Scene } from '@/components/site/Scene';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

const inputClass =
  'block w-full rounded-none border-0 border-b border-foreground/30 bg-transparent px-0 py-3 text-[1.0625rem] text-foreground placeholder:text-foreground/55 transition-colors focus:border-foreground/70 focus:outline-none focus:ring-0 focus-visible:outline-none disabled:opacity-60';

export function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({ kind: 'error', message: 'Please fill in all three fields.' });
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      await api('/api/contact', { method: 'POST', body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }) });
      setStatus({ kind: 'sent' });
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong. Email works too.' });
    }
  };

  const sending = status.kind === 'sending';

  return (
    <Scene id="contact" label="Contact" scene="dawn" hold className="relative pb-24 pt-6 md:pb-32 md:pt-10">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-x-8">
        <Reveal className="md:col-span-4">
          <a href={`mailto:${PERSONAL_INFO.email}`} className="group legible inline-flex items-center gap-2 text-[clamp(1.25rem,1.9vw,1.625rem)] font-[400] tracking-[-0.015em] text-foreground transition-colors hover:text-[hsl(var(--tone))]" style={{ fontStretch: '106%' }}>
            {PERSONAL_INFO.email}
            <ArrowUpRight size={18} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <div className="t-kicker legible mt-6 flex gap-6 text-foreground/55">
            {SOCIAL_LINKS.map(s => (
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                {s.name}
              </a>
            ))}
          </div>
        </Reveal>
        <Reveal delay={100} className="md:col-span-7 md:col-start-6">
          <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            <label className="block">
              <span className="sr-only">Name</span>
              <input autoComplete="name" value={name} onChange={e => setName(e.target.value)} disabled={sending} placeholder="Name" className={inputClass} />
            </label>
            <label className="block">
              <span className="sr-only">Email</span>
              <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} disabled={sending} placeholder="Email" className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className="sr-only">Message</span>
              <textarea rows={3} maxLength={5000} value={message} onChange={e => setMessage(e.target.value)} disabled={sending} placeholder="Message" className={cn(inputClass, 'resize-none')} />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-2">
              <p role="status" aria-live="polite" className={cn('text-[0.875rem]', status.kind === 'error' ? 'text-destructive' : 'text-foreground/60')}>
                {status.kind === 'sent' && 'Thank you. I’ll get back to you soon.'}
                {status.kind === 'error' && status.message}
              </p>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-[0.9375rem] font-[500] text-background transition-opacity hover:opacity-85 disabled:opacity-60"
              >
                {sending && <Loader2 size={15} className="animate-spin" />}
                {sending ? 'Sending' : 'Send message'}
              </button>
            </div>
          </form>
        </Reveal>
      </div>
    </Scene>
  );
}
