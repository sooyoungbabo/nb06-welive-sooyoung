import { Response } from 'express';
const clients = new Map<string, Response>();

// export function addClient(userId: string, res: Response) {
//   clients.set(userId, res);
// }

export function addClient(userId: string, res: Response) {
  const existing = clients.get(userId);

  if (existing && !existing.writableEnded) {
    // 기존 연결이 살아있으면 안전하게 종료
    try {
      existing.write(': server closing old connection\n\n');
      existing.end();
    } catch {}
  }

  clients.set(userId, res);
}

export function removeClient(userId: string) {
  const existed = clients.delete(userId);
  console.log('SSE connection closed:', userId, 'removed:', existed);
}

export function getClient(userId: string) {
  return clients.get(userId);
}

export function sendToUser(userId: string, payload: unknown) {
  const client = clients.get(userId);
  if (!client) return;

  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  console.log(data);

  client.write(`data: ${data}\n\n`);
}

export function sendToAll(data: any) {
  for (const client of clients.values()) {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
