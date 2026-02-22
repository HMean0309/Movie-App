import { prisma } from '../../lib/prisma';
import { nanoid } from 'nanoid';

// Tạo phòng mới
export async function createRoom(hostUserId: string, movieId: string, episodeId?: string) {
  const inviteCode = nanoid(6).toUpperCase(); // Mã mời 6 ký tự: "ABC123"

  return prisma.watchPartyRoom.create({
    data: {
      inviteCode,
      host: { connect: { id: hostUserId } },
      movie: { connect: { id: movieId } },
      ...(episodeId ? { episode: { connect: { id: episodeId } } } : {}),
    },
    include: {
      movie: { select: { name: true, thumbUrl: true, slug: true } },
      episode: { select: { episodeName: true, linkM3u8: true } },
    },
  });
}

// Join phòng bằng invite code
export async function joinRoom(userId: string, inviteCode: string) {
  const room = await prisma.watchPartyRoom.findUnique({
    where: { inviteCode },
    include: {
      movie: { select: { name: true, thumbUrl: true } },
      episode: { select: { episodeName: true, linkM3u8: true } },
      members: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
    },
  });

  if (!room) throw new Error('Phòng không tồn tại hoặc mã mời sai');

  // Thêm vào members nếu chưa có
  await prisma.watchPartyMember.upsert({
    where: { roomId_userId: { roomId: room.id, userId } },
    update: {},
    create: { roomId: room.id, userId },
  });

  return room;
}

// Lấy thông tin phòng
export async function getRoom(roomId: string) {
  return prisma.watchPartyRoom.findUnique({
    where: { id: roomId },
    include: {
      host: { select: { id: true, fullName: true } },
      movie: true,
      episode: true,
      members: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
    },
  });
}

// Cập nhật trạng thái phòng (timestamp, isPlaying)
export async function updateRoomState(
  roomId: string,
  state: { currentTime?: number; isPlaying?: boolean; episodeId?: string }
) {
  return prisma.watchPartyRoom.update({
    where: { id: roomId },
    data: state,
  });
}

// Xóa thành viên khỏi phòng
export async function leaveRoom(userId: string, roomId: string) {
  try {
    await prisma.watchPartyMember.delete({
      where: { roomId_userId: { roomId, userId } },
    });
  } catch (error) {
    // Có thể user đã thoái hoặc không tồn tại
  }
}
