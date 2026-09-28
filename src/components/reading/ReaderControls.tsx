import type { ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ReaderSize, useReaderPrefs } from './reader-prefs';

type Prefs = ReturnType<typeof useReaderPrefs>;

const SIZES: { v: ReaderSize; label: string; px: string }[] = [
  { v: 's', label: 'Smaller text', px: '0.8125rem' },
  { v: 'm', label: 'Default text size', px: '1rem' },
  { v: 'l', label: 'Larger text', px: '1.25rem' },
];

function Segment<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { v: T; content: ReactNode; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="reader-seg">
      {options.map(o => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          aria-label={o.label}
          onClick={() => onChange(o.v)}
          className={cn('reader-seg-btn', value === o.v && 'is-on')}
        >
          {o.content}
        </button>
      ))}
    </div>
  );
}

export function ReaderPanel({ prefs }: { prefs: Prefs }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="reader-panel-label">Text size</div>
        <Segment
          label="Text size"
          value={prefs.size}
          onChange={prefs.setSize}
          options={SIZES.map(s => ({ v: s.v, label: s.label, content: <span className="font-text leading-none" style={{ fontSize: s.px }}>A</span> }))}
        />
      </div>
      <div>
        <div className="reader-panel-label">Page</div>
        <Segment
          label="Page theme"
          value={prefs.theme}
          onChange={prefs.setTheme}
          options={[
            { v: 'night', label: 'Night', content: <><span className="reader-swatch bg-[hsl(228_26%_6%)]" />Night</> },
            { v: 'paper', label: 'Paper', content: <><span className="reader-swatch bg-[hsl(42_38%_93%)]" />Paper</> },
          ]}
        />
      </div>
    </div>
  );
}

export function ReaderControls({ prefs, className, side = 'right', align = 'start' }: { prefs: Prefs; className?: string; side?: 'top' | 'right' | 'bottom' | 'left'; align?: 'start' | 'center' | 'end' }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn('reader-aa', className)} aria-label="Reading settings">
          <span aria-hidden="true" className="font-text text-[1.05rem] leading-none">A</span>
          <span aria-hidden="true" className="font-text text-[0.8rem] leading-none">a</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} sideOffset={10} className="reader-pop w-[15.5rem]">
        <ReaderPanel prefs={prefs} />
      </PopoverContent>
    </Popover>
  );
}
