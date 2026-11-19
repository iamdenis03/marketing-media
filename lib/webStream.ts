import type { Readable } from 'stream';

/**
 * Converts a Node stream to a Web ReadableStream for route responses.
 *
 * Unlike Readable.toWeb, it tolerates the browser cancelling mid-stream (video seeking,
 * closed tab, aborted download): late chunks are dropped instead of throwing
 * "Controller is already closed". It also pauses the source when the client reads slowly,
 * so large files never pile up in memory.
 */
export function nodeStreamToWeb(stream: Readable, onCancel?: () => void): ReadableStream<Uint8Array> {
  let closed = false;
  return new ReadableStream<Uint8Array>(
    {
      start(controller) {
        stream.on('data', (chunk: Buffer) => {
          if (closed) return;
          try {
            controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
            if ((controller.desiredSize ?? 1) <= 0) stream.pause();
          } catch {
            closed = true;
            stream.destroy();
          }
        });
        stream.on('end', () => {
          if (closed) return;
          closed = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
        stream.on('error', (err) => {
          if (closed) return;
          closed = true;
          try {
            controller.error(err);
          } catch {
            /* already closed */
          }
        });
      },
      pull() {
        if (!closed) stream.resume();
      },
      cancel() {
        closed = true;
        stream.destroy();
        onCancel?.();
      },
    },
    { highWaterMark: 4 * 1024 * 1024, size: (chunk) => chunk.byteLength }
  );
}
