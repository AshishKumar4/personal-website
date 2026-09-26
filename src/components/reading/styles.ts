export const DISPLAY_TITLE = 'font-display font-[300] [font-stretch:125%] tracking-[-0.035em] text-foreground text-balance';

export const MONO_LABEL = 'font-mono text-[0.6875rem] uppercase tracking-[0.18em]';

export const READING_MEASURE = 'mx-auto w-full max-w-[66ch] font-text text-[1.1875rem]';

export const CHAPTER_PROSE = [
  '[&_h2]:mt-20 [&_h2]:border-t-0 [&_h2]:pt-0 [&_h2]:font-display [&_h2]:text-[clamp(1.75rem,3vw,2.35rem)] [&_h2]:font-[340] [&_h2]:leading-[1.08] [&_h2]:tracking-[-0.03em] [&_h2]:[font-stretch:118%]',
  '[&_h2]:before:mb-5 [&_h2]:before:flex [&_h2]:before:items-center [&_h2]:before:gap-3 [&_h2]:before:font-mono [&_h2]:before:text-[0.6875rem] [&_h2]:before:uppercase [&_h2]:before:tracking-[0.18em] [&_h2]:before:text-foreground/40 [&_h2]:before:content-[counter(chapter,upper-roman)]',
].join(' ');

export const POST_PROSE = [
  '[&_h2]:font-[360] [&_h2]:[font-stretch:115%] [&_h2]:tracking-[-0.025em] [&_h2]:mt-16',
  '[&_h3]:font-display [&_h3]:font-[500] [&_h3]:[font-stretch:108%]',
  '[&>p:first-child]:text-[1.3rem] [&>p:first-child]:leading-[1.6] [&>p:first-child]:text-foreground',
].join(' ');
