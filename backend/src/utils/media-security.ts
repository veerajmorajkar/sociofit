import dns from 'node:dns/promises';
import net from 'node:net';
import { env } from '../config/env.js';
import { R2_PUBLIC_URL } from '../config/r2.js';

/**
 * SSRF prevention for any server-side fetch of a URL that ultimately came from
 * client input or the database (cover images, avatars, post media, etc.).
 *
 * `assertTrustedMediaUrl` MUST be called, and awaited, before any `fetch()` of
 * such a URL. It rejects anything that isn't https, isn't on our own allowlisted
 * media hosts, is expressed as a raw IP, or resolves (including via DNS
 * rebinding) to a private/loopback/link-local/reserved address.
 */

const IPV4_BLOCKLIST: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved
];

function ipv4ToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + (Number(octet) & 0xff), 0) >>> 0;
}

function isIpv4InCidr(ip: string, base: string, prefixBits: number): boolean {
  const mask = prefixBits === 0 ? 0 : (~0 << (32 - prefixBits)) >>> 0;
  return (ipv4ToLong(ip) & mask) === (ipv4ToLong(base) & mask);
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  return IPV4_BLOCKLIST.some(([base, bits]) => isIpv4InCidr(ip, base, bits));
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — validate the embedded IPv4 address too.
    const mapped = normalized.split(':').pop();
    if (mapped && net.isIPv4(mapped)) return isPrivateOrReservedIpv4(mapped);
  }
  // fc00::/7 (unique local) and fe80::/10 (link-local)
  return (
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
}

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateOrReservedIpv4(ip);
  if (net.isIPv6(ip)) return isPrivateOrReservedIpv6(ip);
  return true; // unknown shape — fail closed
}

/** Hostnames we trust to fetch on the server's behalf. Sourced from env, never user input. */
export function trustedMediaHostnames(): string[] {
  const hosts = new Set<string>();
  const addHost = (rawUrl: string | undefined) => {
    if (!rawUrl) return;
    try {
      hosts.add(new URL(rawUrl).hostname.toLowerCase());
    } catch {
      // ignore malformed config value
    }
  };
  addHost(R2_PUBLIC_URL);
  addHost(env.MEDIA_CDN_URL);
  return [...hosts];
}

export class UntrustedMediaUrlError extends Error {}

/**
 * Throws `UntrustedMediaUrlError` unless `url` is https, on an allowlisted
 * hostname, expressed as a hostname (not a raw IP), and resolves only to
 * public IP addresses. Call this BEFORE any server-side `fetch()`.
 */
export async function assertTrustedMediaUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UntrustedMediaUrlError('Invalid media URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new UntrustedMediaUrlError('Media URL must use https');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (net.isIP(hostname)) {
    throw new UntrustedMediaUrlError('Media URL must use a hostname, not a raw IP address');
  }

  const allowlist = trustedMediaHostnames();
  if (allowlist.length === 0 || !allowlist.includes(hostname)) {
    throw new UntrustedMediaUrlError('Media URL host is not on the trusted allowlist');
  }

  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UntrustedMediaUrlError('Could not resolve media URL host');
  }

  if (records.length === 0 || records.some((r) => isPrivateOrReservedIp(r.address))) {
    throw new UntrustedMediaUrlError('Media URL resolves to a disallowed address');
  }
}

/** Non-throwing convenience wrapper for call sites that just need a boolean. */
export async function isTrustedMediaUrl(url: string): Promise<boolean> {
  try {
    await assertTrustedMediaUrl(url);
    return true;
  } catch {
    return false;
  }
}
