export function fmtTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function fmtSize(b: number): string {
  if (!b) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Generate premium mock visual waveforms for each track card
export function getMockWaveform(seed: string): number[] {
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const heights = [];
  for (let i = 0; i < 28; i++) {
    heights.push(15 + ((hash * (i + 3)) % 75)); // standard heights between 15% and 90%
  }
  return heights;
}

// Generate unique glowing gradients based on song titles
export function getGradientFromTitle(title: string): string {
  const hash = Array.from(title).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-pink-500 via-rose-500 to-red-500',
    'from-purple-600 via-indigo-500 to-blue-500',
    'from-blue-500 via-cyan-500 to-teal-400',
    'from-emerald-400 via-teal-500 to-indigo-600',
    'from-amber-400 via-orange-500 to-rose-500',
    'from-violet-500 via-fuchsia-500 to-pink-500'
  ];
  return gradients[hash % gradients.length];
}
