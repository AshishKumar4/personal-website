import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useTheme } from '@/hooks/use-theme';
import { sampler } from '@/lib/diffusion/sampler-store';
import { formatCount, repoStats, shortDuration } from '@/lib/site-data';
import { scrollToHash } from '@/lib/site-events';
import { PERSONAL_INFO, SOCIAL_LINKS } from '@/components/config/constants';

interface TerminalProps {
  open: boolean;
  onClose: () => void;
}

type Line = { id: number; kind: 'in' | 'out' | 'err' | 'accent'; text: React.ReactNode };

const PROMPT = 'visitor@ashish:~$';
const COMMANDS = ['help', 'whoami', 'about', 'ls', 'cat', 'work', 'projects', 'open', 'writing', 'read', 'neofetch', 'resample', 'noise', 'theme', 'contact', 'social', 'boot', 'hire', 'sudo', 'echo', 'date', 'pwd', 'history', 'clear', 'exit'];

const LOGO = [
  '      ▄▄▄▄▄▄▄      ',
  '    ▄█▀     ▀█▄    ',
  '   ██   ▄▄▄   ██   ',
  '   ██  █▀ ▀█  ██   ',
  '   ██  █▄▄▄█  ██   ',
  '    ▀█▄     ▄█▀    ',
  '      ▀▀███▀▀ ▄    ',
  '             ▀▀▀   ',
];

const BOOT = [
  'Aqeous x86 bootloader v0.15 (built at age 15, from a phone)',
  'Detecting CPUs............... SMP: 4 cores online',
  'Enabling paging.............. ok',
  'Mounting AqFS................ ok',
  'Loading ELF /bin/compositor.. ok',
  'Starting window manager...... ok',
  'Handing over to a Durable Object (see: do86)… ok',
  'Welcome back.',
];

let lineId = 0;
const L = (kind: Line['kind'], text: React.ReactNode): Line => ({ id: lineId++, kind, text });

export default function Terminal({ open, onClose }: TerminalProps) {
  const navigate = useNavigate();
  const { config, data, github } = useSiteConfig();
  const { isDark, toggleTheme } = useTheme();
  const [lines, setLines] = useState<Line[]>(() => [
    L('accent', 'aqsh 0.1 — a tiny shell in memory of Aqeous OS'),
    L('out', "type 'help' to see what I can do. esc to close."),
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openedAt = useRef(Date.now());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);

  const print = useCallback((...next: Line[]) => setLines(prev => [...prev, ...next].slice(-400)), []);

  const execute = (raw: string) => {
    const line = raw.trim();
    print(L('in', line));
    if (!line) return;
    setHistory(h => [...h, line].slice(-50));
    const [cmd, ...args] = line.split(/\s+/);
    const arg = args.join(' ');
    const posts = data?.posts ?? [];
    const projects = data?.projects ?? [];
    const exps = data?.experiences ?? [];
    switch (cmd.toLowerCase()) {
      case 'help':
        print(
          L('out', 'available commands:'),
          ...[
            ['whoami', 'who is this'],
            ['about | cat about.md', 'the abstract'],
            ['ls', 'list everything'],
            ['work', 'the training run'],
            ['projects | open <n>', 'samples, open one on GitHub'],
            ['writing | read <n>', 'notes'],
            ['neofetch', 'system info'],
            ['resample | noise <0-1000>', 'play with the hero sampler'],
            ['theme', 'ink ↔ paper'],
            ['contact | social | hire', 'reach out'],
            ['boot', 'relive 2016'],
            ['clear | exit', ''],
          ].map(([c, d]) => L('out', <span><span className="text-signal">{c.padEnd(26, ' ')}</span>{d}</span>)),
        );
        break;
      case 'whoami':
        print(L('out', `${PERSONAL_INFO.name} — ${config?.subtitle ?? ''}`), L('out', exps[0] ? `${exps[0].role} @ ${exps[0].company}` : PERSONAL_INFO.title));
        break;
      case 'about':
        print(L('out', config?.about ?? ''));
        break;
      case 'cat':
        if (/about/.test(arg)) print(L('out', config?.about ?? ''));
        else if (/bio/.test(arg)) print(L('out', config?.bio ?? ''));
        else print(L('err', `cat: ${arg || '(nothing)'}: try 'cat about.md' or 'cat bio.txt'`));
        break;
      case 'ls':
        print(L('out', <span><span className="text-signal">work/  projects/  writing/</span>  about.md  bio.txt  contact</span>));
        break;
      case 'work':
      case 'experience':
        exps.forEach((e, i) => print(L('out', `ckpt_${String(exps.length - i).padStart(2, '0')}  ${shortDuration(e.duration).padEnd(22, ' ')} ${e.company} — ${e.role}`)));
        break;
      case 'projects':
        projects.forEach((p, i) => {
          const s = repoStats(github, p.repo);
          print(L('out', `[${i + 1}] ${p.name.padEnd(34, ' ')} ${s ? `★ ${formatCount(s.stars)}` : ''}`));
        });
        print(L('out', "open one with 'open <n>'"));
        break;
      case 'open': {
        const n = Number(arg) - 1;
        const p = Number.isInteger(n) && n >= 0 ? projects[n] : projects.find(x => x.name.toLowerCase().includes(arg.toLowerCase()));
        if (!p || !arg) print(L('err', 'open: no such project. try `projects`.'));
        else {
          window.open(p.url || `https://github.com/${p.repo}`, '_blank', 'noopener');
          print(L('out', `opening ${p.repo || p.name}…`));
        }
        break;
      }
      case 'writing':
      case 'blog':
        posts.forEach((p, i) => print(L('out', `[${i + 1}] ${new Date(p.createdAt).getFullYear()}  ${p.title}`)));
        print(L('out', "read one with 'read <n>'"));
        break;
      case 'read': {
        const p = posts[Number(arg) - 1];
        if (!p) print(L('err', 'read: no such note. try `writing`.'));
        else {
          onClose();
          navigate(`/blog/${p.slug}`);
        }
        break;
      }
      case 'neofetch': {
        const s = sampler.get();
        const stars = github ? Object.values(github.repos).reduce((a, r) => a + r.stars, 0) : null;
        const info: [string, string][] = [
          ['OS', 'Aqeous x86 (SMP), est. age 15'],
          ['Host', 'Cloudflare Workers · Durable Objects'],
          ['Kernel', 'hand-written C + x86 asm'],
          ['Shell', 'aqsh 0.1'],
          ['Renderer', s.renderer || 'Canvas2D'],
          ['Sampler', `DDIM · ${s.steps} steps · seed 0x${s.seed.toString(16).toUpperCase()}`],
          ['Resolution', `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`],
          ['Theme', isDark ? 'ink' : 'paper'],
          ['Uptime', `${Math.round((Date.now() - openedAt.current) / 1000)}s in this shell`],
          ...(stars ? [['Stars', `${formatCount(stars)} across featured repos`] as [string, string]] : []),
        ];
        print(
          L('out', (
            <div className="flex flex-col gap-4 sm:flex-row">
              <pre className="text-signal">{LOGO.join('\n')}</pre>
              <div>
                <div className="text-foreground">visitor<span className="text-muted-foreground">@</span>ashish</div>
                <div className="text-muted-foreground">-----------------</div>
                {info.map(([k, v]) => (
                  <div key={k}><span className="text-signal">{k}</span>: {v}</div>
                ))}
              </div>
            </div>
          )),
        );
        break;
      }
      case 'resample':
      case 'sample':
        if (window.location.pathname !== '/') navigate('/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        sampler.command({ type: 'resample' });
        print(L('accent', `sampling with a fresh seed… (x_T ~ N(0, I))`));
        break;
      case 'noise': {
        const v = Math.max(0, Math.min(1000, Number(arg)));
        if (!arg || Number.isNaN(v)) print(L('err', 'usage: noise <0-1000>'));
        else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          sampler.command({ type: 'noise', t: v / 1000 });
          print(L('out', `q(x_${v} | x_0): injecting noise, then denoising back.`));
        }
        break;
      }
      case 'theme':
        toggleTheme();
        print(L('out', `switched to ${isDark ? 'paper' : 'ink'} mode`));
        break;
      case 'contact':
      case 'email':
        print(L('out', <a className="underline decoration-signal" href={`mailto:${PERSONAL_INFO.email}`}>{PERSONAL_INFO.email}</a>));
        break;
      case 'social':
        SOCIAL_LINKS.forEach(s => print(L('out', <a className="underline decoration-signal" href={s.url} target="_blank" rel="noopener noreferrer">{s.name.padEnd(10, ' ')} {s.url}</a>)));
        break;
      case 'hire':
        print(L('accent', 'excellent decision. taking you to the contact form…'));
        timers.current.push(window.setTimeout(() => {
          onClose();
          if (window.location.pathname !== '/') navigate('/#contact');
          else scrollToHash('#contact');
        }, 700));
        break;
      case 'boot':
        BOOT.forEach((b, i) => timers.current.push(window.setTimeout(() => print(L(i === BOOT.length - 1 ? 'accent' : 'out', b)), 160 * (i + 1))));
        break;
      case 'sudo':
        print(L('err', 'visitor is not in the sudoers file. This incident will be reported.'));
        break;
      case 'rm':
        print(L('err', 'nice try. this filesystem is content-addressed and version controlled.'));
        break;
      case 'echo':
        print(L('out', arg));
        break;
      case 'date':
        print(L('out', new Date().toString()));
        break;
      case 'pwd':
        print(L('out', '/home/visitor'));
        break;
      case 'cd':
        print(L('out', 'there is only ~ here.'));
        break;
      case 'history':
        history.forEach((h, i) => print(L('out', `${String(i + 1).padStart(3, ' ')}  ${h}`)));
        break;
      case 'clear':
        setLines([]);
        break;
      case 'exit':
        onClose();
        break;
      default:
        print(L('err', `aqsh: command not found: ${cmd}. try 'help'.`));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      execute(input);
      setInput('');
      setCursor(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = cursor < 0 ? history.length - 1 : Math.max(0, cursor - 1);
      if (history[next] !== undefined) {
        setCursor(next);
        setInput(history[next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = cursor + 1;
      if (cursor >= 0 && next < history.length) {
        setCursor(next);
        setInput(history[next]);
      } else {
        setCursor(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const match = COMMANDS.filter(c => c.startsWith(input.trim()));
      if (match.length === 1) setInput(`${match[0]} `);
      else if (match.length > 1) print(L('out', match.join('  ')));
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key.toLowerCase() === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-background/40 p-3 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="aqsh terminal"
        onMouseDown={e => e.stopPropagation()}
        onClick={() => inputRef.current?.focus()}
        className="flex h-[min(70vh,520px)] w-full max-w-3xl flex-col overflow-hidden border border-line/20 bg-card shadow-2xl shadow-black/50 animate-fade-in"
      >
        <div className="flex items-center justify-between border-b border-line/10 px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
          <span>aqsh — visitor@ashishkumarsingh.com:~</span>
          <button onClick={onClose} className="hover:text-foreground" aria-label="Close terminal">
            <X size={14} />
          </button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed">
          {lines.map(l => (
            <div
              key={l.id}
              className={
                l.kind === 'in'
                  ? 'text-foreground'
                  : l.kind === 'err'
                    ? 'whitespace-pre-wrap text-destructive'
                    : l.kind === 'accent'
                      ? 'whitespace-pre-wrap text-signal'
                      : 'whitespace-pre-wrap text-foreground/70'
              }
            >
              {l.kind === 'in' ? <><span className="text-signal">{PROMPT}</span> {l.text}</> : l.text}
            </div>
          ))}
          <div className="flex items-center text-foreground">
            <span className="shrink-0 text-signal">{PROMPT}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              aria-label="Terminal input"
              className="ml-2 flex-1 border-0 bg-transparent p-0 font-mono text-[12.5px] text-foreground caret-signal outline-none focus:outline-none focus-visible:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
