import 'dotenv/config';
import { Worker } from 'bullmq';
import { generateDigest } from './digest.job';

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

// runs as a separate process (npm run worker) - the http server never blocks on this
const worker = new Worker(
  'digest',
  async (job) => {
    if (job.name === 'generate') {
      return generateDigest(job.data.workspaceId);
    }
  },
  { connection },
);

worker.on('completed', (job) => console.log(`job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`job ${job?.id} failed`, err.message));

console.log('digest worker started, listening for jobs...');
