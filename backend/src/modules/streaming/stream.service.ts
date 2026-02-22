import redis from '../../lib/redis';
import { getCurrentSubscription } from '../subscriptions/subscription.service';
import { v4 as uuidv4 } from 'uuid';

const STREAM_TTL = 60; // seconds - hết hạn nếu không heartbeat
const STREAM_KEY = (userId: string) => `stream:active:${userId}`;

// Bắt đầu stream — kiểm tra concurrent limit
export async function startStream(userId: string): Promise<string> {
  const sub = await getCurrentSubscription(userId);
  const maxStreams = sub.plan.maxStreams;

  // Dùng Lua script để đảm bảo atomic (check + set cùng 1 lúc)
  // Lua script chạy atomically trên Redis, không bị race condition
  const luaScript = `
    local key = KEYS[1]
    local streamId = ARGV[1]
    local maxStreams = tonumber(ARGV[2])
    local ttl = tonumber(ARGV[3])

    -- Xóa các stream đã hết hạn trước (TTL tự xóa trong Set không work)
    local members = redis.call('SMEMBERS', key)
    for _, member in ipairs(members) do
      local streamKey = key .. ':' .. member
      if redis.call('EXISTS', streamKey) == 0 then
        redis.call('SREM', key, member)
      end
    end

    -- Đếm lại sau khi cleanup
    local currentCount = redis.call('SCARD', key)

    if currentCount >= maxStreams then
      return -1  -- Đã đạt giới hạn
    end

    -- Thêm stream mới
    redis.call('SADD', key, streamId)
    redis.call('SETEX', key .. ':' .. streamId, ttl, '1')
    redis.call('EXPIRE', key, ttl + 10)

    return 1  -- Thành công
  `;

  const streamId = uuidv4();
  const result = await redis.eval(
    luaScript,
    1,                        // số lượng KEYS
    STREAM_KEY(userId),       // KEYS[1]
    streamId,                 // ARGV[1]
    String(maxStreams),        // ARGV[2]
    String(STREAM_TTL)         // ARGV[3]
  );

  if (result === -1) {
    throw new Error(
      `Tài khoản của bạn chỉ được xem trên ${maxStreams} thiết bị cùng lúc. Vui lòng dừng thiết bị khác trước.`
    );
  }

  return streamId; // Trả về streamId để client dùng heartbeat + stop
}

// Heartbeat — gia hạn TTL để giữ stream sống
export async function heartbeat(userId: string, streamId: string): Promise<boolean> {
  const key = STREAM_KEY(userId);
  const streamKey = `${key}:${streamId}`;

  // Kiểm tra stream còn tồn tại không
  const exists = await redis.exists(streamKey);
  if (!exists) return false; // Stream đã hết hạn

  // Gia hạn TTL
  await redis.expire(streamKey, STREAM_TTL);
  await redis.expire(key, STREAM_TTL + 10);
  return true;
}

// Dừng stream — xóa khỏi Redis ngay
export async function stopStream(userId: string, streamId: string): Promise<void> {
  const key = STREAM_KEY(userId);
  await redis.srem(key, streamId);
  await redis.del(`${key}:${streamId}`);
}

// Lấy số stream đang active (để debug / hiển thị)
export async function getActiveStreams(userId: string): Promise<number> {
  return redis.scard(STREAM_KEY(userId));
}
