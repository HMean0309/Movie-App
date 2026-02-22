import type { Request, Response } from 'express';
import * as partyService from './watch-party.service';

export async function createRoomHandler(req: Request, res: Response) {
  try {
    const { movieId, episodeId } = req.body;
    console.log('[WatchParty] createRoom → body:', req.body, '| user:', req.user);

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
      return;
    }
    if (!movieId) {
      res.status(400).json({ success: false, message: 'Thiếu movieId' });
      return;
    }
    const room = await partyService.createRoom(req.user.id, movieId, episodeId);
    res.status(201).json({ success: true, data: room });
  } catch (err: any) {
    console.error('[WatchParty] createRoom error:', err?.message, err?.code, err?.meta);
    res.status(500).json({ success: false, message: err.message, code: err?.code });
  }
}

export async function joinRoomHandler(req: Request, res: Response) {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      res.status(400).json({ success: false, message: 'Thiếu invite code' });
      return;
    }
    const room = await partyService.joinRoom(req.user!.id, inviteCode);
    res.json({ success: true, data: room });
  } catch (err: any) {
    const status = err.message.includes('không tồn tại') ? 404 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
}

export async function getRoomHandler(req: Request, res: Response) {
  try {
    const roomId = req.params.roomId as string;
    const room = await partyService.getRoom(roomId);
    if (!room) {
      res.status(404).json({ success: false, message: 'Phòng không tồn tại' });
      return;
    }
    res.json({ success: true, data: room });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
