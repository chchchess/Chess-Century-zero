export type ChessSoundType = 'move' | 'capture' | 'castle' | 'check' | 'promote' | 'gameover';

const SOUND_TYPES: ChessSoundType[] = ['move', 'capture', 'castle', 'check', 'promote', 'gameover'];

const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
const SOUND_URLS: Record<ChessSoundType, string> = {
  move: `${base}sounds/move.mp3`,
  capture: `${base}sounds/capture.mp3`,
  castle: `${base}sounds/castle.mp3`,
  check: `${base}sounds/check.mp3`,
  promote: `${base}sounds/promote.mp3`,
  gameover: `${base}sounds/gameover.mp3`,
};

let audioCtx: AudioContext | null = null;
const rawArrayBuffers: Partial<Record<ChessSoundType, ArrayBuffer>> = {};
const rawPromises: Partial<Record<ChessSoundType, Promise<ArrayBuffer | null>>> = {};
const decodedBuffers: Partial<Record<ChessSoundType, AudioBuffer>> = {};
const decodePromises: Partial<Record<ChessSoundType, Promise<AudioBuffer | null>>> = {};
let preloaded = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioCtx = new AudioContextCtor();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

async function fetchRawAudio(type: ChessSoundType): Promise<ArrayBuffer | null> {
  if (rawArrayBuffers[type]) return rawArrayBuffers[type]!;
  if (rawPromises[type]) return rawPromises[type]!;

  const p = fetch(SOUND_URLS[type])
    .then(async (res) => {
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      rawArrayBuffers[type] = buf;
      return buf;
    })
    .catch(() => null);

  rawPromises[type] = p;
  return p;
}

async function ensureDecoded(ctx: AudioContext, type: ChessSoundType): Promise<AudioBuffer | null> {
  if (decodedBuffers[type]) return decodedBuffers[type]!;
  if (decodePromises[type]) return decodePromises[type]!;

  const p = (async () => {
    try {
      const raw = await fetchRawAudio(type);
      if (!raw) return null;
      const copy = raw.slice(0);
      const decoded = await ctx.decodeAudioData(copy);
      decodedBuffers[type] = decoded;
      return decoded;
    } catch {
      return null;
    }
  })();

  decodePromises[type] = p;
  return p;
}

export function preloadChessSounds(): void {
  if (typeof window === 'undefined' || preloaded) return;
  preloaded = true;
  SOUND_TYPES.forEach((type) => {
    void fetchRawAudio(type);
  });
}

function playViaHtmlAudio(type: ChessSoundType): void {
  try {
    const audio = new Audio(SOUND_URLS[type]);
    audio.volume = 0.92;
    void audio.play().catch(() => {
      // Ignore autoplay block
    });
  } catch {
    // Ignore unsupported audio element
  }
}

if (typeof window !== 'undefined') {
  preloadChessSounds();
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx) {
      SOUND_TYPES.forEach((type) => {
        void ensureDecoded(ctx, type);
      });
    }
  };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true, passive: true });
}

export function playChessSound(type: ChessSoundType, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;

  const ctx = getAudioContext();
  const cached = decodedBuffers[type];
  if (ctx && cached) {
    try {
      const src = ctx.createBufferSource();
      src.buffer = cached;
      const gain = ctx.createGain();
      gain.gain.value = 0.92;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      return;
    } catch {
      // Fall back to HTMLAudioElement below
    }
  }

  playViaHtmlAudio(type);
  if (ctx) {
    void ensureDecoded(ctx, type);
  }
}
