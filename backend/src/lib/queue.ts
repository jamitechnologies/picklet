import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null
});

export const QUEUE_NAME = 'picket-jobs';

export const prQueue = new Queue(QUEUE_NAME, { connection: connection as any });

export interface PRJobData {
    installationId: number;
    repoName: string; // owner/repo
    prNumber: number;
    headSha: string;
    baseSha: string;
    cloneUrl: string;
}

export type JobProcessor = (data: PRJobData) => Promise<void>;

export function setupWorker(processor: JobProcessor) {
    console.log(`Starting worker for queue: ${QUEUE_NAME}`);

    const worker = new Worker(QUEUE_NAME, async (job: Job<PRJobData>) => {
        console.log(`Processing job ${job.id}: PR #${job.data.prNumber} in ${job.data.repoName}`);

        try {
            await processor(job.data);
            console.log(`Job ${job.id} completed successfully.`);
        } catch (error) {
            console.error(`Job ${job.id} failed:`, error);
            throw error;
        }
    }, { connection: connection as any });

    worker.on('completed', job => {
        console.log(`Job ${job.id} completed!`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} failed with ${err.message}`);
    });
}
