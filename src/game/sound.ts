type Wave = 'sine' | 'square' | 'sawtooth' | 'triangle';
type FilterKind = 'lowpass' | 'bandpass';
interface ToneOptions {
  slide?: number;
  at?: number;
  out?: AudioNode;
  detune?: number;
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const BPM = 104;
const EIGHTH = 60 / BPM / 2;
const MELODY = [
  [69, 72, 76, 72, 69, 64],
  [74, 77, 81, 77, 74, 69],
  [76, 68, 71, 76, 80, 71],
  [69, 72, 76, 81, 76, 72],
  [65, 69, 72, 77, 72, 69],
  [74, 77, 74, 69, 65, 62],
  [71, 68, 64, 74, 71, 68],
  [69, 64, 60, 57, 0, 0],
];
const BASS = [45, 50, 40, 45, 41, 38, 40, 45];

const FADE_IN = 1.5;
const FADE_OUT = 1.2;
const FADE_PAUSE = 0.5;

class Sound {
  private ctx: AudioContext | null = null;

  private master: GainNode | null = null;

  private musicBus: GainNode | null = null;

  private echo: DelayNode | null = null;

  private noise: AudioBuffer | null = null;

  private wind: AudioBufferSourceNode | null = null;

  private musicTimer = 0;

  private nextNoteTime = 0;

  private noteIndex = 0;

  private musicOn = false;

  muted = false;

  private intensity = 0;

  private echoFeedback: GainNode | null = null;

  private windGain: GainNode | null = null;

  private windLfo: OscillatorNode | null = null;

  private windFilter: BiquadFilterNode | null = null;

  unlock() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.setupGraph(this.ctx);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  private setupGraph(ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);

    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = 0.33;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    this.echoFeedback = feedback;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    this.echo.connect(tone).connect(feedback).connect(this.echo);
    tone.connect(this.musicBus);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  }

  private tone(freq: number, dur: number, type: Wave, vol: number, opts: ToneOptions = {}) {
    const { slide = 0, at = 0, out, detune = 0 } = opts;
    const { ctx, master } = this;
    if (!ctx || !master || this.muted) return;
    const t = (at || ctx.currentTime) + 0.001;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    if (detune) osc.detune.setValueAtTime(detune, t);
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(out ?? master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private hiss(dur: number, vol: number, from: number, to: number, type: FilterKind) {
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise || this.muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = 4;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
    src.stop(t + dur);
  }

  private fadeTo(param: AudioParam, target: number, seconds: number) {
    const { ctx } = this;
    if (!ctx) return;
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(target, t + seconds);
  }

  startMusic(fade = FADE_IN) {
    const { ctx, musicBus } = this;
    if (!ctx || !musicBus || this.musicOn) return;
    this.musicOn = true;
    this.noteIndex = 0;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.fadeTo(musicBus.gain, this.muted ? 0 : 1, fade);
    this.startWind();
    window.clearInterval(this.musicTimer);
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 25);
  }

  stopMusic(fade = FADE_OUT) {
    const { ctx, musicBus } = this;
    if (!ctx || !musicBus || !this.musicOn) return;
    this.musicOn = false;
    window.clearInterval(this.musicTimer);
    this.fadeTo(musicBus.gain, 0, fade);
    const { wind } = this;
    this.wind = null;
    window.setTimeout(() => wind?.stop(), fade * 1000 + 100);
  }

  setMusicPaused(paused: boolean) {
    const { ctx, musicBus } = this;
    if (!ctx || !musicBus || !this.musicOn) return;
    this.fadeTo(musicBus.gain, paused || this.muted ? 0 : 1, paused ? FADE_PAUSE : FADE_IN);
  }

  setIntensity(value: number) {
    const v = Math.min(1, Math.max(0, value));
    if (Math.abs(v - this.intensity) < 0.01) return;
    this.intensity = v;
    this.applyIntensity();
  }

  private applyIntensity() {
    const { ctx } = this;
    if (!ctx) return;
    const k = this.intensity;
    const t = ctx.currentTime;
    this.windGain?.gain.setTargetAtTime(0.035 + 0.075 * k, t, 0.5);
    this.windLfo?.frequency.setTargetAtTime(0.07 + 0.35 * k, t, 0.5);
    this.windFilter?.Q.setTargetAtTime(1.2 + 3 * k, t, 0.5);
    this.echoFeedback?.gain.setTargetAtTime(0.35 + 0.2 * k, t, 0.5);
  }

  private scheduleMusic() {
    const { ctx } = this;
    if (!ctx || !this.musicOn) return;
    while (this.nextNoteTime < ctx.currentTime + 0.15) {
      this.playNote(this.noteIndex, this.nextNoteTime);
      this.nextNoteTime += EIGHTH * (BPM / (BPM + 36 * this.intensity));
      this.noteIndex = (this.noteIndex + 1) % (MELODY.length * 6);
    }
  }

  private playNote(index: number, at: number) {
    const { musicBus, echo } = this;
    if (!musicBus || !echo) return;
    const bar = Math.floor(index / 6);
    const beat = index % 6;
    const note = MELODY[bar][beat];
    const k = this.intensity;
    const detune = k ? (Math.random() * 2 - 1) * 30 * k : 0;
    if (note) {
      this.tone(hz(note), 0.5, 'triangle', 0.07, { at, out: musicBus, detune });
      this.tone(hz(note + 12), 0.25, 'sine', 0.025, { at, out: musicBus });
      this.tone(hz(note), 0.5, 'triangle', 0.035, { at, out: echo });
    }
    if (k > 0 && (beat === 0 || beat === 3)) {
      this.tone(55, 0.18, 'sine', 0.22 * k, { at, out: musicBus, slide: -15 });
      this.tone(50, 0.16, 'sine', 0.15 * k, { at: at + 0.16, out: musicBus, slide: -12 });
    }
    if (beat === 0 && k > 0) {
      this.tone(hz(BASS[bar] + 18), EIGHTH * 6, 'sawtooth', 0.025 * k, { at, out: musicBus });
    }
    if (beat === 0) {
      this.tone(hz(BASS[bar]), EIGHTH * 6, 'sine', 0.09, { at, out: musicBus });
      if (bar % 4 === 3) this.tone(hz(93), 1.2, 'sine', 0.02, { at: at + EIGHTH * 4, out: echo });
    }
  }

  private startWind() {
    const { ctx, musicBus, noise } = this;
    if (!ctx || !musicBus || !noise) return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.value = 500;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    this.windLfo = lfo;
    this.windFilter = filter;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 260;
    lfo.connect(lfoDepth).connect(filter.frequency);
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    this.windGain = gain;
    this.applyIntensity();
    src.connect(filter).connect(gain).connect(musicBus);
    src.start();
    lfo.start();
    src.addEventListener('ended', () => lfo.stop());
    this.wind = src;
  }

  step(n: number) {
    this.tone(260 + (n % 4) * 18, 0.07, 'triangle', 0.08, { slide: -80 });
  }

  jump() {
    this.tone(260, 0.2, 'square', 0.05, { slide: 420 });
  }

  hit() {
    this.tone(150, 0.32, 'sawtooth', 0.12, { slide: -100 });
    this.tone(90, 0.25, 'sine', 0.18, { slide: -40 });
    this.hiss(0.18, 0.08, 1200, 300, 'lowpass');
  }

  candy() {
    this.tone(784, 0.1, 'square', 0.05);
    window.setTimeout(() => this.tone(1175, 0.16, 'square', 0.05), 70);
  }

  lowFuel() {
    this.tone(1200, 0.03, 'triangle', 0.05);
  }

  lanternOut() {
    this.hiss(0.6, 0.12, 3000, 400, 'bandpass');
    this.tone(520, 0.5, 'triangle', 0.06, { slide: -300 });
  }

  pumpkinWarn() {
    this.tone(330, 0.12, 'square', 0.04, { slide: 120 });
    window.setTimeout(() => this.tone(330, 0.12, 'square', 0.04, { slide: 120 }), 140);
  }

  dodge() {
    this.tone(660, 0.12, 'triangle', 0.06, { slide: 440 });
    window.setTimeout(() => this.tone(1320, 0.14, 'sine', 0.04), 90);
  }

  ghost() {
    this.hiss(0.5, 0.08, 1800, 500, 'bandpass');
    this.tone(880, 0.45, 'sine', 0.03, { slide: -440 });
  }

  gameOver() {
    this.tone(330, 0.35, 'triangle', 0.12, { slide: -60 });
    window.setTimeout(() => this.tone(262, 0.35, 'triangle', 0.12, { slide: -50 }), 280);
    window.setTimeout(() => this.tone(196, 0.9, 'triangle', 0.14, { slide: -90 }), 560);
  }
}

export const sound = new Sound();
