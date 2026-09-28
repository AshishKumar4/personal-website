import type { SceneId } from '@shared/types';

export interface FlightTelemetry {
  scene: SceneId;
  sceneMix: number;
  distance: number;
}

export interface FlightEvents {
  pulse: { x: number; y: number; strength?: number };
  focus: { hue: number | null; strength?: number };
  telemetry: FlightTelemetry;
}

type Listener<K extends keyof FlightEvents> = (payload: FlightEvents[K]) => void;

const listeners: { [K in keyof FlightEvents]?: Set<Listener<K>> } = {};

export function emitFlight<K extends keyof FlightEvents>(type: K, payload: FlightEvents[K]) {
  const set = listeners[type] as Set<Listener<K>> | undefined;
  set?.forEach(fn => fn(payload));
}

export function onFlight<K extends keyof FlightEvents>(type: K, fn: Listener<K>): () => void {
  let set = listeners[type] as Set<Listener<K>> | undefined;
  if (!set) {
    set = new Set();
    (listeners as Record<string, Set<Listener<K>>>)[type] = set;
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
  };
}
