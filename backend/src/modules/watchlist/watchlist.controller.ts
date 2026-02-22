import type { Request, Response } from 'express';
import * as watchlistService from './watchlist.service';

export async function addHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const { movieId } = req.body;

        if (!movieId) {
            return res.status(400).json({ success: false, message: 'Thiếu movieId' });
        }

        await watchlistService.addToWatchlist(userId, movieId);
        res.json({ success: true, message: 'Đã thêm vào danh sách' });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function removeHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const movieId = req.params.movieId as string;

        await watchlistService.removeFromWatchlist(userId, movieId);
        res.json({ success: true, message: 'Đã xóa khỏi danh sách' });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function getHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const movies = await watchlistService.getWatchlist(userId);
        res.json({ success: true, data: movies });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
}

export async function checkHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user.userId;
        const movieId = req.params.movieId as string;

        const isInList = await watchlistService.checkInWatchlist(userId, movieId);
        res.json({ success: true, data: { isInList } });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
}
