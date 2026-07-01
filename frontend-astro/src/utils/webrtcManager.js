import Peer from 'peerjs';
import { db } from '../db';

let peer = null;
let connections = {}; // connected local peers

// Initialize WebRTC Peer
// In a real scenario, the Cloudflare backend would help discover peers within the same tenant.
// For this local sync, we'll assume a known master peer ID based on the tenant ID (e.g. `tenant-xyz-master`).
export const initWebRTC = (tenantId, isMaster = false) => {
    const peerId = isMaster ? `pos-${tenantId}-master` : `pos-${tenantId}-client-${Math.random().toString(36).substr(2, 9)}`;
    
    // We use the default PeerJS server for signaling (or our own Cloudflare WS later)
    peer = new Peer(peerId);

    peer.on('open', (id) => {
        console.log('My WebRTC Peer ID is: ' + id);
        if (!isMaster) {
            connectToMaster(`pos-${tenantId}-master`);
        }
    });

    peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
        connections[conn.peer] = conn;
        setupConnectionListeners(conn);
    });
};

const connectToMaster = (masterId) => {
    const conn = peer.connect(masterId);
    conn.on('open', () => {
        console.log('Connected to local master:', masterId);
        connections[masterId] = conn;
        setupConnectionListeners(conn);
    });
};

const setupConnectionListeners = (conn) => {
    conn.on('data', async (data) => {
        console.log('Received data from local network:', data);
        if (data.type === 'MUTATION') {
            // Apply the mutation to local Dexie immediately
            try {
                if (data.action === 'insert') {
                    await db[data.table_name].put(data.data);
                } else if (data.action === 'update') {
                    await db[data.table_name].update(data.data.id, data.data);
                } else if (data.action === 'delete') {
                    await db[data.table_name].delete(data.data.id);
                }
                console.log(`Local sync applied to ${data.table_name}`);
            } catch (err) {
                console.error('Failed to apply local mutation', err);
            }
        }
    });
};

export const broadcastLocalMutation = (tableName, action, data) => {
    const payload = { type: 'MUTATION', table_name: tableName, action, data };
    Object.values(connections).forEach(conn => {
        if (conn && conn.open) {
            conn.send(payload);
        }
    });
};
