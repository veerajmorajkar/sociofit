import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.DATABASE_URL ??= 'postgresql://fitsocial:fitsocial@localhost:5432/fitsocial';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-1234567890';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-1234567890';
process.env.R2_PUBLIC_URL = 'https://media.example.com';

const lookupMock = vi.fn();

vi.mock('node:dns/promises', () => ({
  default: { lookup: (...args: unknown[]) => lookupMock(...args) },
  lookup: (...args: unknown[]) => lookupMock(...args),
}));

const { assertTrustedMediaUrl, UntrustedMediaUrlError } =
  await import('../src/utils/media-security.js');

function mockLookup(records: Array<{ address: string; family: number }>) {
  lookupMock.mockResolvedValue(records);
}

beforeEach(() => {
  lookupMock.mockReset();
});

describe('assertTrustedMediaUrl (SSRF prevention)', () => {
  it('rejects a URL containing a raw IP instead of the allowlisted hostname', async () => {
    await expect(assertTrustedMediaUrl('https://1.2.3.4/posts/x.jpg')).rejects.toThrow(
      UntrustedMediaUrlError,
    );
  });

  it('rejects a non-allowlisted domain even if it resolves publicly', async () => {
    mockLookup([{ address: '93.184.216.34', family: 4 }]);
    await expect(assertTrustedMediaUrl('https://evil.attacker.com/x.jpg')).rejects.toThrow(
      UntrustedMediaUrlError,
    );
  });

  it('rejects http (non-https) URLs', async () => {
    await expect(assertTrustedMediaUrl('http://media.example.com/x.jpg')).rejects.toThrow(
      UntrustedMediaUrlError,
    );
  });

  it('rejects a DNS-rebinding style URL whose allowlisted hostname resolves to a private IP', async () => {
    mockLookup([{ address: '127.0.0.1', family: 4 }]);
    await expect(assertTrustedMediaUrl('https://media.example.com/x.jpg')).rejects.toThrow(
      UntrustedMediaUrlError,
    );
  });

  it('rejects when the hostname resolves to an internal IPv4 range (10.x, 172.16-31.x, 192.168.x, 169.254.x)', async () => {
    for (const ip of ['10.0.0.5', '172.16.5.5', '192.168.1.1', '169.254.1.1']) {
      mockLookup([{ address: ip, family: 4 }]);
      await expect(assertTrustedMediaUrl('https://media.example.com/x.jpg')).rejects.toThrow(
        UntrustedMediaUrlError,
      );
    }
  });

  it('rejects when the hostname resolves to an IPv6 loopback or unique-local address', async () => {
    mockLookup([{ address: '::1', family: 6 }]);
    await expect(assertTrustedMediaUrl('https://media.example.com/x.jpg')).rejects.toThrow(
      UntrustedMediaUrlError,
    );

    mockLookup([{ address: 'fc00::1', family: 6 }]);
    await expect(assertTrustedMediaUrl('https://media.example.com/x.jpg')).rejects.toThrow(
      UntrustedMediaUrlError,
    );
  });

  it('accepts a valid, allowlisted R2 URL that resolves to a public IP', async () => {
    mockLookup([{ address: '203.0.113.10', family: 4 }]);
    await expect(
      assertTrustedMediaUrl('https://media.example.com/posts/u1/x.jpg'),
    ).resolves.toBeUndefined();
  });
});
