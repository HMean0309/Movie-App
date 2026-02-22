import { Queue } from "bullmq";
import { redisConnection } from "../lib/bullmq";

export const syncMoviesQueue = new Queue('sync-movies', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay : 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,

    }
});