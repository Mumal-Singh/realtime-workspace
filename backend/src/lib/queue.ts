import { Queue } from 'bullmq';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
};

// single queue for now, jobType field on the payload tells the worker what to do
export const digestQueue = new Queue('digest', { connection });

// NOTE: no retry/backoff options passed here (default is "attempts: 1").
// I wanted to add attempts: 3 + exponential backoff so a job that fails because
// Postgres hiccuped doesn't just die silently, but I was already over budget
// on this section and didn't want to add a retry policy I hadn't actually
// tested failing-and-recovering. Left as a known gap in the README instead of
// guessing at numbers.
