import { ConnectionOptions } from "bullmq";
import redis from "./redis"; // Use the existing ioredis instance

export const redisConnection: any = redis;