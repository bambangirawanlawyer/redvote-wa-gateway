import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_URL_LENGTH = 2048;
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

function normalizeHost(hostname: string): string {
  return hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts as [number, number, number, number];

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 192 && b === 0 && parts[2] === 2) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const value = address.toLowerCase();
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fc') || value.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(value)) return true;
  if (value.startsWith('ff')) return true;
  if (value.startsWith('2001:db8:')) return true;

  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIpv4(mapped[1]!) : false;
}

export function isPrivateOrReservedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

export type DocumentUrlPolicy = {
  allowedHosts: ReadonlySet<string>;
};

export function createDocumentUrlPolicy(allowedHosts: string[]): DocumentUrlPolicy {
  return {
    allowedHosts: new Set(
      allowedHosts
        .map((host) => normalizeHost(host.trim()))
        .filter(Boolean)
    )
  };
}

export async function validateDocumentUrl(
  raw: string,
  policy: DocumentUrlPolicy
): Promise<URL> {
  if (!raw || raw.length > MAX_URL_LENGTH) throw new Error('INVALID_DOCUMENT_SOURCE');

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('INVALID_DOCUMENT_SOURCE');
  }

  if (url.username || url.password) throw new Error('INVALID_DOCUMENT_SOURCE');

  const hostname = normalizeHost(url.hostname);
  const allowlisted = policy.allowedHosts.has(hostname);

  if (allowlisted) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('INVALID_DOCUMENT_SOURCE');
    }
    return url;
  }

  if (url.protocol !== 'https:') throw new Error('INVALID_DOCUMENT_SOURCE');

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('INVALID_DOCUMENT_SOURCE');
  }

  if (isIP(hostname)) {
    if (isPrivateOrReservedAddress(hostname)) throw new Error('INVALID_DOCUMENT_SOURCE');
    return url;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('INVALID_DOCUMENT_SOURCE');
  }

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateOrReservedAddress(address))
  ) {
    throw new Error('INVALID_DOCUMENT_SOURCE');
  }

  return url;
}

export async function fetchPdfWithPolicy(
  documentUrl: string,
  policy: DocumentUrlPolicy,
  maxPdfBytes: number
): Promise<Buffer> {
  let current = await validateDocumentUrl(documentUrl, policy);

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    let response: Response;
    try {
      response = await fetch(current, { redirect: 'manual' });
    } catch {
      throw new Error('INVALID_DOCUMENT_SOURCE');
    }

    if (REDIRECT_CODES.has(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirects === 3) throw new Error('INVALID_DOCUMENT_SOURCE');
      current = await validateDocumentUrl(new URL(location, current).toString(), policy);
      continue;
    }

    if (!response.ok) throw new Error('INVALID_DOCUMENT_SOURCE');

    const contentLength = Number(response.headers.get('content-length') ?? '0');
    if (Number.isFinite(contentLength) && contentLength > maxPdfBytes) {
      throw new Error('DOCUMENT_TOO_LARGE');
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('application/pdf')) {
      throw new Error('UNSUPPORTED_DOCUMENT_TYPE');
    }

    if (!response.body) throw new Error('INVALID_DOCUMENT_SOURCE');

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxPdfBytes) {
        await reader.cancel();
        throw new Error('DOCUMENT_TOO_LARGE');
      }
      chunks.push(Buffer.from(value));
    }

    if (totalBytes === 0) throw new Error('INVALID_DOCUMENT_SOURCE');
    const bytes = Buffer.concat(chunks, totalBytes);
    if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new Error('UNSUPPORTED_DOCUMENT_TYPE');
    }
    return bytes;
  }

  throw new Error('INVALID_DOCUMENT_SOURCE');
}
