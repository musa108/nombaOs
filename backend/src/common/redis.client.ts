import type Redis from 'ioredis';

let client: Redis | null = null;

export function setRedisClient(c: Redis) {
  client = c;
}

export function clearRedisClient() {
  client = null;
}

export function getRedisClient(): Redis | null {
  return client;
}
