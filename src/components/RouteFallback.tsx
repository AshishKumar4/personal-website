export function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <span className="animate-pulse font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">sampling…</span>
    </div>
  );
}
