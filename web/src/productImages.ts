const images: Record<string, string> = {
  kingshot: '/images/products/kingshot.png',
  osota: '/images/products/osota.png',
  'command-center': '/images/products/command-center.png',
  'auto-help': '/images/products/auto-help.png',
};

const fallbacks: Record<string, string> = {
  kingshot: '👑',
  osota: '🌐',
  'command-center': '⚔️',
  'auto-help': '⚡',
};

export function productImage(key: string): string | null {
  return images[key] ?? null;
}

export function productFallback(key: string): string {
  return fallbacks[key] ?? '📦';
}
