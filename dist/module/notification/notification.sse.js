"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addClient = addClient;
exports.removeClient = removeClient;
exports.getClient = getClient;
exports.sendToUser = sendToUser;
exports.sendToAll = sendToAll;
const clients = new Map();
function addClient(userId, res) {
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
