import type { Request, Response } from 'express';

/**
 * Opens a Server-Sent Events response with keep-alive pings and returns helpers
 * to push events or tear the stream down. The client (browser EventSource or
 * the admin app's fetch-based reader) reconnects automatically on drops.
 */
export function openSse(req: Request, res: Response): { send: (data: unknown) => void; close: () => void } {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
  res.write(': connected\n\n');

  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      /* client gone */
    }
  }, 25000);

  const send = (data: unknown): void => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      /* client gone */
    }
  };

  const close = (): void => {
    clearInterval(ping);
    try {
      res.end();
    } catch {
      /* already closed */
    }
  };

  req.on('close', close);
  return { send, close };
}
