"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addClient = addClient;
exports.removeClient = removeClient;
exports.getClient = getClient;
exports.sendToUser = sendToUser;
exports.sendToAll = sendToAll;
const clients = new Map();
// export function addClient(userId: string, res: Response) {
//   clients.set(userId, res);
// }
function addClient(userId, res) {
    const existing = clients.get(userId);
    if (existing && !existing.writableEnded) {
        // 기존 연결이 살아있으면 안전하게 종료
        try {
            existing.write(': server closing old connection\n\n');
            existing.end();
        }
        catch (_a) { }
    }
    clients.set(userId, res);
}
function removeClient(userId) {
    const existed = clients.delete(userId);
    console.log('SSE connection closed:', userId, 'removed:', existed);
}
function getClient(userId) {
    return clients.get(userId);
}
function sendToUser(userId, payload) {
    const client = clients.get(userId);
    if (!client)
        return;
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    console.log(data);
    client.write(`data: ${data}\n\n`);
}
function sendToAll(data) {
    for (const client of clients.values()) {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
    }
}
