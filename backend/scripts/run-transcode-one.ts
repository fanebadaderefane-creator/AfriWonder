/**
 * Traite un seul job de transcodage en attente (CDC pipeline HLS).
 * Usage: npx tsx scripts/run-transcode-one.ts [--job-id=uuid]
 * Sans --job-id: prend le premier job pending.
 * Nécessite: FFmpeg installé, DATABASE_URL, optionnellement TRANSCODE_OUTPUT_BASE_URL
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { getPendingJobs, processJob } from '../src/services/transcoding.service';
import prisma from '../src/config/database';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  let jobId: string | null = null;
  for (const a of args) {
    if (a.startsWith('--job-id=')) jobId = a.slice('--job-id='.length);
  }

  const backendDir = path.resolve(__dirname, '..');
  const workDir = path.join(backendDir, 'tmp', 'transcode');
  const outputBaseUrl = process.env.TRANSCODE_OUTPUT_BASE_URL || null;

  let job: { id: string; video_id: string; status: string } | null;
  if (jobId) {
    job = await prisma.transcodingJob.findUnique({ where: { id: jobId } }) as any;
    if (!job) {
      console.error('Job not found:', jobId);
      process.exit(1);
    }
    if (job.status !== 'pending') {
      console.error('Job status is not pending:', job.status);
      process.exit(1);
    }
  } else {
    const pending = await getPendingJobs(1);
    job = pending[0] as any;
    if (!job) {
      console.log('No pending transcoding jobs.');
      process.exit(0);
    }
  }

  console.log('Processing job', job.id, 'video_id=', job.video_id);
  const result = await processJob(job.id, {
    workDir: path.join(workDir, job.id),
    outputBaseUrl: outputBaseUrl || undefined,
  });

  if (result.success) {
    console.log('Done. hls_manifest_url=', result.hls_manifest_url);
  } else {
    console.error('Failed:', result.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
