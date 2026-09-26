const NOTES = [392, 440, 523.25, 587.33, 659.25, 783.99];

export class FlightAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private low: BiquadFilterNode | null = null;
  private whistle: BiquadFilterNode | null = null;
  private whistleGain: GainNode | null = null;
  private fx: GainNode | null = null;
  on = false;

  enable() {
    this.on = true;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      const len = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        let last = 0;
        for (let i = 0; i < len; i++) {
          last = (last + 0.035 * (Math.random() * 2 - 1)) / 1.035;
          d[i] = last * 3.2;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.low = ctx.createBiquadFilter();
      this.low.type = 'lowpass';
      this.low.frequency.value = 400;
      this.low.Q.value = 0.8;
      this.whistle = ctx.createBiquadFilter();
      this.whistle.type = 'bandpass';
      this.whistle.frequency.value = 900;
      this.whistle.Q.value = 9;
      this.whistleGain = ctx.createGain();
      this.whistleGain.gain.value = 0;
      src.connect(this.low).connect(this.master);
      src.connect(this.whistle).connect(this.whistleGain).connect(this.master);
      this.master.connect(ctx.destination);
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.29;
      const fb = ctx.createGain();
      fb.gain.value = 0.38;
      const wet = ctx.createGain();
      wet.gain.value = 0.5;
      this.fx = ctx.createGain();
      this.fx.connect(ctx.destination);
      this.fx.connect(delay);
      delay.connect(fb).connect(delay);
      delay.connect(wet).connect(ctx.destination);
      src.start();
    }
    void this.ctx.resume();
  }

  disable() {
    this.on = false;
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0, t, 0.15);
    const ctx = this.ctx;
    window.setTimeout(() => {
      if (!this.on) void ctx.suspend();
    }, 800);
  }

  update(speed: number, boost: number) {
    if (!this.on || !this.ctx || !this.master || !this.low || !this.whistle || !this.whistleGain) return;
    const t = this.ctx.currentTime;
    const s = Math.min(1, speed / 60);
    this.master.gain.setTargetAtTime(0.06 + s * 0.08 + boost * 0.12, t, 0.25);
    this.low.frequency.setTargetAtTime(260 + s * 500 + boost * 1400, t, 0.25);
    this.whistle.frequency.setTargetAtTime(700 + s * 300 + boost * 900, t, 0.4);
    this.whistleGain.gain.setTargetAtTime(0.05 + boost * 0.25, t, 0.3);
  }

  chime(strength = 1) {
    if (!this.on || !this.ctx || !this.fx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const f = NOTES[Math.floor(Math.random() * NOTES.length)];
    for (const [mul, amp] of [[1, 0.09], [2, 0.025], [3.01, 0.01]]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f * mul;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * strength, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 / mul);
      o.connect(g).connect(this.fx);
      o.start(t);
      o.stop(t + 2.6);
    }
  }

  dispose() {
    this.on = false;
    void this.ctx?.close();
    this.ctx = null;
  }
}
