import React from 'react';

/**
 * A calm, solid reading surface for long-form content (blog posts, the About page).
 * The card is opaque so the animated background never shows behind text; on wide
 * screens the effect stays visible in the side gutters.
 */
export function ReadingSurface({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 px-4 py-12 sm:py-16 md:py-20">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-background shadow-xl shadow-black/5 dark:shadow-black/30 px-6 sm:px-10 md:px-14 py-10 md:py-14">
        {children}
      </article>
    </div>
  );
}
