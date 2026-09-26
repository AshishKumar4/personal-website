export type SamplerPhase = 'waiting' | 'sampling' | 'done';

export interface SamplerState {
  t: number;
  step: number;
  steps: number;
  seed: number;
  phase: SamplerPhase;
  elapsedMs: number;
  renderer: string;
  scroll: number;
}

type Listener = (s: SamplerState) => void;
type CommandListener = (cmd: SamplerCommand) => void;

export type SamplerCommand =
  | { type: 'resample' }
  | { type: 'noise'; t: number };

function randomSeed(): number {
  return (Math.random() * 0xffff) | 0;
}

const state: SamplerState = {
  t: 1,
  step: 0,
  steps: 60,
  seed: randomSeed(),
  phase: 'waiting',
  elapsedMs: 0,
  renderer: '',
  scroll: 0,
};

const listeners = new Set<Listener>();
const commandListeners = new Set<CommandListener>();

export const sampler = {
  get(): SamplerState {
    return state;
  },
  update(partial: Partial<SamplerState>) {
    Object.assign(state, partial);
    listeners.forEach(l => l(state));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  },
  command(cmd: SamplerCommand) {
    commandListeners.forEach(l => l(cmd));
  },
  onCommand(listener: CommandListener): () => void {
    commandListeners.add(listener);
    return () => commandListeners.delete(listener);
  },
  newSeed(): number {
    state.seed = randomSeed();
    return state.seed;
  },
};
