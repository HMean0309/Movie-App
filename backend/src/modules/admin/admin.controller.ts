import type { Request, Response } from 'express';
import * as adminService from './admin.service';
import * as syncService from './sync.service';

export async function getDashboardStats(req: Request, res: Response) {
    try {
        const stats = await adminService.getDashboardStats();
        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
}

export async function startSync(req: Request, res: Response) {
    if (syncService.syncProgress.status === 'running') {
        return res.status(400).json({ success: false, message: 'Đang có tiến trình đồng bộ' });
    }
    syncService.runSmartSync().catch(console.error);
    res.json({ success: true, message: 'Bắt đầu đồng bộ' });
}

export async function stopSync(req: Request, res: Response) {
    syncService.stopSmartSync();
    res.json({ success: true, message: 'Đang gửi tín hiệu dừng...' });
}

export function streamSyncProgress(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent(syncService.syncProgress);

    const interval = setInterval(() => {
        sendEvent(syncService.syncProgress);
        if (['done', 'error', 'idle'].includes(syncService.syncProgress.status)) {
            clearInterval(interval);
            res.end();
        }
    }, 1000);

    req.on('close', () => clearInterval(interval));
}
