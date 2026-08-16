/**
 * Tiny in-memory pub/sub that streams ticket activity to live listeners
 * (customer site + admin panel). Events are emitted from the route handlers so
 * the payloads already carry the owner id needed for per-user filtering.
 */
export type TicketEvent =
  | { type: 'new'; ticketId: number; userId: string; subject?: string }
  | { type: 'message'; ticketId: number; userId: string; author: 'user' | 'staff'; subject?: string }
  | { type: 'status'; ticketId: number; userId: string; status: 'open' | 'closed' }
  | { type: 'deleted'; ticketId: number; userId: string };

type Listener = (evt: TicketEvent) => void;

const listeners = new Set<Listener>();

export function subscribeTickets(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitTicketEvent(evt: TicketEvent): void {
  for (const fn of listeners) {
    try {
      fn(evt);
    } catch {
      /* listener error must never break other listeners */
    }
  }
}
