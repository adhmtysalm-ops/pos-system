import { db } from '../db';
import axios from 'axios'; // We can use axios to push to Cloudflare

// Cloudflare API URL
const CLOUDFLARE_API = 'https://pos-saas-backend.adhomatya.workers.dev/api/protected/sync';

export const startBackgroundSync = (token) => {
    // Attempt to sync immediately when coming online
    window.addEventListener('online', () => {
        console.log('Internet restored! Attempting sync...');
        pushSyncQueue(token);
    });

    // Attempt to sync every 12 hours (43200000 ms)
    setInterval(() => {
        if (navigator.onLine) {
            console.log('Running 12-hour background sync...');
            pushSyncQueue(token);
        }
    }, 43200000); 
};

export const pushSyncQueue = async (token) => {
    if (!navigator.onLine) return; // Cannot sync offline

    try {
        // Grab all unsynced operations
        const operations = await db.sync_queue.where('synced').equals(0).toArray();
        if (operations.length === 0) {
            console.log('Sync Queue is empty.');
            return;
        }

        console.log(`Pushing ${operations.length} operations to Cloudflare...`);

        // Send to Cloudflare Worker
        const response = await axios.post(CLOUDFLARE_API, { operations }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            // Mark as synced locally
            const idsToUpdate = operations.map(op => op.id);
            await db.sync_queue.bulkUpdate(
                idsToUpdate.map(id => ({ key: id, changes: { synced: 1 } }))
            );
            console.log('Sync successful!');
        }
    } catch (error) {
        console.error('Cloudflare Sync failed. Will retry later.', error);
    }
};
