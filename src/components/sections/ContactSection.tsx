import React, { useState } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { PERSONAL_INFO, SOCIAL_LINKS } from '@/components/config/constants';
import { Container } from '@/components/site/SectionHeader';
import { ScrollField } from '@/components/diffusion/ScrollField';
import { ScrambleText } from '@/components/diffusion/ScrambleText';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="group block">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors group-focus-within:text-signal">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'mt-2 block w-full border-0 border-b border-line/25 bg-transparent px-0 pb-3 pt-1 text-[1.15rem] text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-signal focus:outline-none focus:ring-0 focus-visible:outline-none disabled:opacity-60';

export function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({ kind: 'error', message: 'All three fields are needed to condition the sample.' });
      return;
    }
    setStatus({ kind: 'sending' });
    try {
      await api('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      setStatus({ kind: 'sent' });
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong. Try email instead?' });
    }
  };

  const sending = status.kind === 'sending';

  return (
    <section id="contact" className="relative z-10 bg-background pb-24 pt-12 md:pb-32" aria-label="Contact">
      <Container>
        <div className="flex items-center justify-between border-t border-line/15 pt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="flex items-center gap-3">
            <span className="text-signal">§05</span>
            <ScrambleText text="Contact" />
          </span>
          <span className="hidden sm:inline">condition the next sample</span>
        </div>
      </Container>
      <div className="relative mt-6 h-[clamp(200px,30vw,480px)] w-full">
        <ScrollField text={status.kind === 'sent' ? 'Thank you' : 'Say hi'} />
      </div>
      <Container className="mt-12 md:mt-16">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-12 md:gap-x-8">
          <div className="md:col-span-4">
            <p className="font-display text-[clamp(1.6rem,2.4vw,2.2rem)] leading-[1.12] tracking-[-0.01em] text-foreground">
              Building something ambitious, curious about a project, or just want to talk kernels, diffusion or drones? I read everything.
            </p>
            <a
              href={`mailto:${PERSONAL_INFO.email}`}
              className="group mt-8 inline-flex items-center gap-2 break-all font-mono text-sm text-foreground hover:text-signal"
            >
              {PERSONAL_INFO.email}
              <ArrowUpRight size={14} className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
            <ul className="mt-8 space-y-0 border-t border-line/10">
              {SOCIAL_LINKS.map(s => (
                <li key={s.name} className="border-b border-line/10">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between py-3 text-sm">
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{s.name}</span>
                    <span className="flex items-center gap-2 text-foreground/85 group-hover:text-signal">
                      {s.handle} <ArrowUpRight size={13} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <form onSubmit={submit} className="md:col-span-7 md:col-start-6" noValidate>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
              <Field id="contact-name" label="Your name">
                <input id="contact-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} disabled={sending} className={inputClass} placeholder="Ada Lovelace" />
              </Field>
              <Field id="contact-email" label="Your email">
                <input id="contact-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} disabled={sending} className={inputClass} placeholder="ada@engine.dev" />
              </Field>
            </div>
            <div className="mt-10">
              <Field id="contact-message" label="Prompt · your message">
                <textarea
                  id="contact-message"
                  rows={5}
                  maxLength={5000}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  disabled={sending}
                  className={cn(inputClass, 'resize-none leading-relaxed')}
                  placeholder="Tell me what you're building…"
                />
              </Field>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-6">
              <p
                className={cn(
                  'font-mono text-[11px] leading-relaxed',
                  status.kind === 'error' ? 'text-destructive' : status.kind === 'sent' ? 'text-signal' : 'text-muted-foreground',
                )}
                role="status"
                aria-live="polite"
              >
                {status.kind === 'error' && status.message}
                {status.kind === 'sent' && 'Received. p(reply | message) is high.'}
                {(status.kind === 'idle' || status.kind === 'sending') && `${message.length}/5000 · guidance scale 7.5`}
              </p>
              <button
                type="submit"
                disabled={sending}
                className="group inline-flex h-14 items-center gap-3 rounded-full bg-foreground pl-7 pr-2 font-mono text-[12px] uppercase tracking-[0.14em] text-background transition-colors hover:bg-signal disabled:opacity-60"
              >
                {sending ? 'Sampling…' : 'Send message'}
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background text-foreground transition-transform duration-500 group-hover:rotate-45">
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <ArrowUpRight size={15} />}
                </span>
              </button>
            </div>
          </form>
        </div>
      </Container>
    </section>
  );
}
