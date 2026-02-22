import redis from './redis';

// Helper: get từ cache hoặc query DB nếu miss
export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Bước 1: Check cache
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  // Bước 2: Cache miss → gọi hàm lấy data thật
  const data = await fetchFn();

  // Bước 3: Lưu vào cache với TTL
  await redis.setex(key, ttlSeconds, JSON.stringify(data));

  return data;
}

// Helper: xóa cache (dùng khi data thay đổi)
export async function invalidateCache(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}
