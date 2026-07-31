import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { proxyTaggerStream } from '@/lib/services/ai/tagger-stream-proxy';

/**
 * GET /api/ai/tagger-progress
 * SSE training-progress stream for any authenticated user — used by the
 * changelog editor's tag suggester to show live progress when the tagger
 * is training instead of just erroring out.
 */
export async function GET() {
  await validateAuthAndGetUser();
  return proxyTaggerStream();
}
