
import redis from "../config/redis";

const WINDOW_SECONDS = 60 * 60;

const reserveSlotScript = `
  local current = tonumber(redis.call("GET", KEYS[1]) or "0")
  local limit = tonumber(ARGV[1])

  if current >= limit then
    return {0, redis.call("TTL", KEYS[1])}
  end

  local count = redis.call("INCR", KEYS[1])

  if count == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[2])
  end

  return {1, count}
`;

export async function reserveHourlySlot(
  senderId: number,
  hourlyLimit: number
): Promise<{ allowed: boolean; count: number; waitSeconds: number }> {
  const key = `email-rate:${senderId}`;

  const result = (await redis.eval(
    reserveSlotScript,
    1,
    key,
    Math.max(1, hourlyLimit),
    WINDOW_SECONDS
  )) as [number, number];

  const allowed = Number(result[0]) === 1;

  return {
    allowed,
    count: allowed ? Number(result[1]) : 0,
    waitSeconds: allowed
      ? 0
      : Math.max(1, Number(result[1]) || WINDOW_SECONDS),
  };
}

export async function releaseHourlySlot(senderId: number) {
  const key = `email-rate:${senderId}`;

  const releaseScript = `
    local current = tonumber(redis.call("GET", KEYS[1]) or "0")

    if current <= 1 then
      redis.call("DEL", KEYS[1])
      return 0
    end

    return redis.call("DECR", KEYS[1])
  `;

  await redis.eval(releaseScript, 1, key);
}

export async function getHourlySentCount(senderId: number) {
  const count = await redis.get(`email-rate:${senderId}`);
  return Number(count || 0);
}

export async function incrementHourlySentCount(senderId: number) {
  const key = `email-rate:${senderId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  return count;
}

export async function getSecondsUntilNextHour(senderId: number) {
  const ttl = await redis.ttl(`email-rate:${senderId}`);
  return ttl > 0 ? ttl : WINDOW_SECONDS;
}