import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { updateRoomState, leaveRoom } from '../modules/watch-party/watch-party.service';
import { prisma } from '../lib/prisma';

interface ServerToClientEvents {
  'room:state': (state: { currentTime: number; isPlaying: boolean; updatedBy: string }) => void;
  'room:members': (members: any[]) => void;
  'chat:message': (msg: { userId: string; name: string; text: string; time: string }) => void;
  'room:episode': (episodeId: string) => void;
  error: (msg: string) => void;
}

interface ClientToServerEvents {
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
  'room:play': (data: { roomId: string; currentTime: number }) => void;
  'room:pause': (data: { roomId: string; currentTime: number }) => void;
  'room:seek': (data: { roomId: string; currentTime: number }) => void;
  'room:episode': (data: { roomId: string; episodeId: string }) => void;
  'chat:send': (data: { roomId: string; text: string }) => void;
}

// Helper: chỉ host mới được control
async function isHost(roomId: string, userId: string): Promise<boolean> {
  const room = await prisma.watchPartyRoom.findUnique({ where: { id: roomId } });
  return room?.hostUserId === userId;
}

// Helper: broadcast members list
async function broadcastMembers(io: Server, roomId: string) {
  const room = await prisma.watchPartyRoom.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
      },
    },
  });
  if (room) io.to(roomId).emit('room:members', room.members);
}

export function initWatchPartySocket(
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Chưa đăng nhập'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const userId = decoded.id ?? decoded.userId ?? decoded.sub;
      socket.data.userId = userId;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      socket.data.userName = user?.fullName || user?.email?.split('@')[0] || 'Ẩn danh';
      socket.data.rooms = [];

      next();
    } catch {
      next(new Error('Token không hợp lệ'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] User connected: ${socket.data.userId}`);

    // ── Join phòng ──────────────────────────────────────────
    socket.on('room:join', async (roomId) => {
      socket.join(roomId);

      // Fix 3: Lưu lại rooms đang ở để cleanup khi disconnect
      socket.data.rooms = [...(socket.data.rooms ?? []), roomId];

      const room = await prisma.watchPartyRoom.findUnique({
        where: { id: roomId },
        include: {
          members: {
            include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
          },
        },
      });

      if (room) {
        // Gửi state hiện tại cho người vừa join
        socket.emit('room:state', {
          currentTime: room.currentTime,
          isPlaying: room.isPlaying,
          updatedBy: room.hostUserId,
        });

        // Broadcast danh sách members mới nhất
        io.to(roomId).emit('room:members', room.members);
      }
    });

    // ── Leave phòng ─────────────────────────────────────────
    socket.on('room:leave', async (roomId) => {
      socket.leave(roomId);
      socket.data.rooms = socket.data.rooms?.filter((r: string) => r !== roomId);
      await broadcastMembers(io as any, roomId);
    });

    // ── Play ────────────────────────────────────────────────
    socket.on('room:play', async ({ roomId, currentTime }) => {
      // Fix 2: Chỉ host mới được control
      if (!(await isHost(roomId, socket.data.userId))) return;

      // Tối ưu: Phát sóng ngay lập tức trước khi đợi DB update
      io.to(roomId).emit('room:state', {
        currentTime,
        isPlaying: true,
        updatedBy: socket.data.userId,
      });
      await updateRoomState(roomId, { currentTime, isPlaying: true });
    });

    // ── Pause ───────────────────────────────────────────────
    socket.on('room:pause', async ({ roomId, currentTime }) => {
      if (!(await isHost(roomId, socket.data.userId))) return;

      // Tối ưu: Phát sóng ngay lập tức
      io.to(roomId).emit('room:state', {
        currentTime,
        isPlaying: false,
        updatedBy: socket.data.userId,
      });
      await updateRoomState(roomId, { currentTime, isPlaying: false });
    });

    // ── Seek ────────────────────────────────────────────────
    socket.on('room:seek', async ({ roomId, currentTime }) => {
      if (!(await isHost(roomId, socket.data.userId))) return;

      // Tối ưu: Phát sóng ngay lập tức
      io.to(roomId).emit('room:state', {
        currentTime,
        isPlaying: true,
        updatedBy: socket.data.userId,
      });
      await updateRoomState(roomId, { currentTime });
    });

    // ── Đổi tập ─────────────────────────────────────────────
    socket.on('room:episode', async ({ roomId, episodeId }) => {
      if (!(await isHost(roomId, socket.data.userId))) return;

      await updateRoomState(roomId, { episodeId, currentTime: 0, isPlaying: false });
      io.to(roomId).emit('room:episode', episodeId);
    });

    // ── Chat ────────────────────────────────────────────────
    socket.on('chat:send', ({ roomId, text }) => {
      // Chat không cần host check — ai cũng nhắn được
      io.to(roomId).emit('chat:message', {
        userId: socket.data.userId,
        name: socket.data.userName,
        text,
        time: new Date().toISOString(),
      });
    });

    // ── Disconnect — Fix 3: cleanup ─────────────────────────
    socket.on('disconnect', async () => {
      console.log(`[Socket] User disconnected: ${socket.data.userId}`);
      for (const roomId of socket.data.rooms ?? []) {
        try {
          await leaveRoom(socket.data.userId, roomId);
          await broadcastMembers(io as any, roomId);
        } catch { }
      }
    });

    socket.on('room:leave', async (roomId) => {
      socket.leave(roomId);
      socket.data.rooms = (socket.data.rooms || []).filter((r: string) => r !== roomId);
      try {
        await leaveRoom(socket.data.userId, roomId);
        await broadcastMembers(io as any, roomId);
      } catch { }
    });
  });
}
