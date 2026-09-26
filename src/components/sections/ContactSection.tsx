import React, { useState } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { PERSONAL_INFO } from '@/components/config/constants';
import { Container } from '@/components/site/SectionHeader';
import { Reveal } from '@/components/site/Reveal';

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string };

const inputClass =
  'block w-full rounded-none border-0 border-b border-white/15 bg-transparent px-0 py-3 text-[1rem] text-foreground placeholder:text-foreground/30 transition-colors focus:border-white/60 focus:outline-none focus:ring-0 focus-visible:outline-none disabled:opacity-60';

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
    <section id="contact" className="relative flex min-h-[100svh] flex-col justify-end pb-16 pt-40" aria-label="Contact">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[-6rem] h-[62%] bg-gradient-to-t from-background via-background/85 to-transparent" />
      <Container className="relative">
        <Reveal>
          <h2 className="font-display text-[clamp(3rem,8.5vw,9.5rem)] font-[540] leading-[0.9] tracking-[-0.05em] text-foreground">
            Let&rsquo;s build
            <br />
            something.
          </h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-12 border-t border-white/15 pt-8 md:mt-20 md:grid-cols-12 md:gap-x-8">
          <Reveal className="md:col-span-4">
            <p className="max-w-sm text-[1rem] leading-relaxed text-foreground/65">
              Working on something ambitious, or want to talk kernels, diffusion or drones? I read everything.
            </p>
            <a href={`mailto:${PERSONAL_INFO.email}`} className="group mt-6 inline-flex items-center gap-1.5 text-[1.05rem] text-foreground transition-colors hover:text-signal">
              {PERSONAL_INFO.email}
              <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
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
                <textarea rows={3} maxLength={5000} value={message} onChange={e => setMessage(e.target.value)} disabled={sending} placeholder="What are you working on?" className={cn(inputClass, 'resize-none')} />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-4 sm:col-span-2">
                <p role="status" aria-live="polite" className={cn('text-[0.875rem]', status.kind === 'error' ? 'text-destructive' : 'text-foreground/55')}>
                  {status.kind === 'sent' && 'Thank you. I’ll get back to you soon.'}
                  {status.kind === 'error' && status.message}
                </p>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-[0.9375rem] font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-60"
                >
                  {sending && <Loader2 size={15} className="animate-spin" />}
                  {sending ? 'Sending' : 'Send message'}
                </button>
              </div>
            </form>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
