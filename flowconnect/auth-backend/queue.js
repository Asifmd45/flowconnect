import Bull from "bull";

export const MAX_RETRIES = Number(process.env.QUEUE_MAX_RETRIES || 3);
export const BACKOFF_DELAY = Number(process.env.QUEUE_BACKOFF_DELAY || 2000);
export const BACKOFF_TYPE = process.env.QUEUE_BACKOFF_TYPE || "exponential";

const REDIS_URL = process.env.REDIS_URL;

export let workflowQueue = null;
export let deadLetterQueue = null;

if (REDIS_URL) {
  const opts = { redis: REDIS_URL };
  workflowQueue = new Bull("workflow-execution", opts);
  deadLetterQueue = new Bull("workflow-dlq", opts);

  workflowQueue.on("error", (err) => {
    console.error("[Queue] Workflow queue error:", err.message);
  });
  deadLetterQueue.on("error", (err) => {
    console.error("[Queue] DLQ error:", err.message);
  });
}

export async function enqueueWorkflowJob(workflowId, executionPayload) {
  if (!workflowQueue) return null;
  return workflowQueue.add(
    { workflowId, executionPayload },
    {
      attempts: MAX_RETRIES,
      backoff: { type: BACKOFF_TYPE, delay: BACKOFF_DELAY },
      removeOnComplete: true,
    }
  );
}
