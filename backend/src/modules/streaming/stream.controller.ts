import type { Request, Response } from 'express';
import * as streamService from './stream.service';

// Bắt đầu xem phim
export async function startStreamHandler(req: Request, res: Response) {
  try {
    const streamId = await streamService.startStream(req.user!.id);
    res.json({
      success: true,
      data: { streamId },
      message: 'Stream bắt đầu. Gửi heartbeat mỗi 30s để duy trì.',
    });
  } catch (err: any) {
    // Lỗi vượt giới hạn → 429 Too Many Requests
    res.status(429).json({ success: false, message: err.message });
  }
}

// Heartbeat — client gọi mỗi 30s
export async function heartbeatHandler(req: Request, res: Response) {
  try {
    const { streamId } = req.body;
    if (!streamId) {
      res.status(400).json({ success: false, message: 'Thiếu streamId' });
      return;
    }

    const alive = await streamService.heartbeat(req.user!.id, streamId);
    if (!alive) {
      res.status(410).json({ success: false, message: 'Stream đã hết hạn, vui lòng tải lại' });
      return;
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// Dừng stream khi user thoát
export async function stopStreamHandler(req: Request, res: Response) {
  try {
    const { streamId } = req.body;
    if (!streamId) {
      res.status(400).json({ success: false, message: 'Thiếu streamId' });
      return;
    }

    await streamService.stopStream(req.user!.id, streamId);
    res.json({ success: true, message: 'Đã dừng stream' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
