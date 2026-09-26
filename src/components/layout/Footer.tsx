import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import { PERSONAL_INFO, SOCIAL_LINKS } from '@/components/config/constants';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { openTerminal } from '@/lib/site-events';
import { timeAgo } from '@/lib/site-data';

const YEAR = new Date().getFullYear();

const BIBTEX = `@misc{singh${YEAR},
  author = {Ashish Kumar Singh},
  title  = {Signal from Noise},
  year   = {${YEAR}},
  url    = {${PERSONAL_INFO.site}}
}`;

function Citation() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(BIBTEX);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between">
        <span className="label">Cite this human</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Copy BibTeX citation"
        >
          {copied ? <Check size={11} className="text-signal" /> : <Copy size={11} />}
          {copied ? 'Copied' : 'BibTeX'}
        </button>
      </div>
      <pre className="overflow-x-auto border border-line/10 bg-card/60 p-4 font-mono text-[11px] leading-relaxed text-foreground/75">
        <code>{BIBTEX}</code>
      </pre>
    </div>
  );
}

export function Footer() {
  const { github } = useSiteConfig();
  const push = github?.lastPush;

  return (
    <footer className="relative z-10 border-t border-line/10 bg-background">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-5 py-16 sm:px-8 md:grid-cols-12 lg:px-12">
        <div className="md:col-span-5">
          <Citation />
        </div>
        <div className="grid grid-cols-2 gap-8 md:col-span-4 md:col-start-7">
          <div>
            <div className="label mb-4">Index</div>
            <ul className="space-y-2 text-sm">
              {[
                ['Home', '/'],
                ['About', '/about'],
                ['Writing', '/blog'],
                ['Projects', '/#projects'],
              ].map(([label, to]) => (
                <li key={label}>
                  <Link to={to} className="link-underline text-foreground/80 hover:text-foreground">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="label mb-4">Elsewhere</div>
            <ul className="space-y-2 text-sm">
              {SOCIAL_LINKS.map(s => (
                <li key={s.name}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="link-underline text-foreground/80 hover:text-foreground">
                    {s.name}
                  </a>
                </li>
              ))}
              <li>
                <a href={`mailto:${PERSONAL_INFO.email}`} className="link-underline text-foreground/80 hover:text-foreground">Email</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="label mb-4">Telemetry</div>
          <ul className="space-y-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {push ? (
              <li>
                last push <span className="text-foreground/80">{timeAgo(push.at)}</span>
                <br />→ {push.repo.split('/')[1]}
              </li>
            ) : (
              <li>last push —</li>
            )}
            {github?.user && <li>{github.user.followers} followers</li>}
            <li>served from the edge</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 border-t border-line/10 px-5 py-5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:px-8 lg:px-12">
        <span>© {YEAR} {PERSONAL_INFO.name}</span>
        <span className="hidden normal-case tracking-normal sm:inline">x<sub>t</sub> = √ᾱ<sub>t</sub>·x<sub>0</sub> + √(1−ᾱ<sub>t</sub>)·ε</span>
        <button onClick={openTerminal} className="transition-colors hover:text-foreground">
          Press <kbd className="rounded border border-line/20 px-1.5 py-0.5 text-foreground/80">`</kbd> for a shell
        </button>
      </div>
    </footer>
  );
}
