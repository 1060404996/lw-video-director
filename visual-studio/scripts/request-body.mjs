export const MAX_REQUEST_BYTES = 9 * 1024 * 1024;

export async function readJsonBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_REQUEST_BYTES) throw new Error('请求超过 9MB');
    chunks.push(buffer);
  }
  // Decode only after reassembly; reject malformed UTF-8 rather than replacing it.
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks, bytes)));
}
