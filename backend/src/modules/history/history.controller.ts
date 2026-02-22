import type { Request, Response } from 'express';
import * as historyService from './history.service';

export async function upsertHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { movieId, episodeId, progressSeconds } = req.body;

        if (!movieId) {
            return res.status(400).json({ success: false, message: 'Thiếu movieId' });
        }

        const history = await historyService.upsertHistory(
            userId,
            movieId,
            episodeId || null,
            progressSeconds || 0
        );

        res.json({ success: true, data: history });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function getHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const history = await historyService.getHistory(userId);
        res.json({ success: true, data: history });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
}
