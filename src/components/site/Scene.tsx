import React, { useRef } from 'react';
import type { SceneId } from '@shared/types';
import { Container } from '@/components/site/SectionHeader';
import { Words } from '@/components/site/Words';
import { useStageRegion } from '@/components/site/stage';
import { SCENE_TONE } from '@/components/site/timeline';

interface SceneProps {
  id: string;
  label: string;
  scene: SceneId;
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
  hold?: boolean;
}

export function Scene({ id, label, scene, children, aside, className, hold = false }: SceneProps) {
  const ref = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  useStageRegion(ref, { kind: 'section', id });
  useStageRegion(head, { kind: 'reveal', id });
  return (
    <section
      ref={ref}
      id={id}
      data-scene={scene}
      aria-labelledby={`${id}-title`}
      className="relative"
      style={{ '--tone': SCENE_TONE[scene] } as React.CSSProperties}
    >
      <div ref={head} className="reveal-title relative flex min-h-[78svh] items-end pb-10 md:min-h-[92svh] md:pb-14">
        <Container>
          <span aria-hidden="true" className="reveal-rule block h-px w-12 bg-[hsl(var(--tone))]" />
          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <Words id={`${id}-title`} text={label} className="t-scene text-[clamp(3rem,11vw,10.5rem)] leading-[0.86] text-foreground" />
            {aside && <div className="reveal-aside pb-2 md:pb-4">{aside}</div>}
          </div>
        </Container>
      </div>
      <div className={className ?? 'relative pb-40 pt-6 md:pb-56 md:pt-10'}>
        <div aria-hidden="true" className={hold ? 'scene-veil-hold pointer-events-none absolute inset-x-0 -top-16 bottom-0' : 'scene-veil pointer-events-none absolute inset-x-0 -top-16 bottom-0'} />
        <Container className="relative">{children}</Container>
      </div>
    </section>
  );
}
