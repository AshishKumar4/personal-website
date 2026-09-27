export class QualityController {
  dpr: number;
  bloom: boolean;
  nextDpr: number;
  nextBloom: boolean;
  ceiling: number;
  private start: number;
  private winStart: number;
  private sum = 0;
  private n = 0;
  private slow = 0;
  private good = 0;
  private bad = 0;
  private lastUpgrade = -Infinity;
  private upgradeWait = 6;

  constructor(dpr: number, private maxDpr: number, bloom: boolean, now: number, private minDpr = 0.75) {
    this.dpr = dpr;
    this.nextDpr = dpr;
    this.bloom = bloom;
    this.nextBloom = bloom;
    this.ceiling = maxDpr;
    this.start = now;
    this.winStart = now;
  }

  get pending() {
    return this.nextDpr !== this.dpr || this.nextBloom !== this.bloom;
  }

  restart(now: number) {
    this.start = now;
    this.reset(now);
  }

  private reset(now: number) {
    this.winStart = now;
    this.sum = 0;
    this.n = 0;
    this.slow = 0;
    this.good = 0;
    this.bad = 0;
  }

  sample(now: number, ms: number) {
    this.sum += ms;
    this.n++;
    if (ms > 20) this.slow++;
    if (now - this.winStart < 1000) return;
    const avg = this.sum / this.n;
    const slow = this.slow / this.n;
    this.winStart = now;
    this.sum = 0;
    this.n = 0;
    this.slow = 0;
    if (now - this.start < 2500 || this.pending) return;
    if (avg > 18 && slow > 0.2) {
      this.bad++;
      this.good = 0;
    } else if (avg < 17.8 && slow < 0.05) {
      this.good++;
      this.bad = 0;
    } else {
      this.bad = 0;
    }
    if (this.bad >= 2) {
      this.bad = 0;
      if (now - this.lastUpgrade < 15000) {
        this.ceiling = Math.max(this.minDpr, this.dpr - 0.125);
        this.upgradeWait = Math.min(this.upgradeWait * 2, 48);
      }
      if (this.dpr > this.minDpr) this.nextDpr = Math.max(this.minDpr, this.dpr - 0.25);
      else if (this.bloom) this.nextBloom = false;
    } else if (this.good >= this.upgradeWait && this.dpr < Math.min(this.maxDpr, this.ceiling)) {
      this.good = 0;
      this.nextDpr = Math.min(this.maxDpr, this.ceiling, this.dpr + 0.125);
    }
  }

  apply(now: number, idle: boolean): boolean {
    if (!this.pending || !idle) return false;
    if (this.nextDpr > this.dpr) this.lastUpgrade = now;
    this.dpr = this.nextDpr;
    this.bloom = this.nextBloom;
    this.reset(now);
    return true;
  }
}
