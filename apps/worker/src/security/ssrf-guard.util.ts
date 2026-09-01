import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

export class SsrfBlockedError extends Error {
  constructor(hostname: string, ip: string) {
    super(`Blocked request to "${hostname}": resolves to ${ip}, a private/reserved address`);
    this.name = 'SsrfBlockedError';
  }
}

export class SsrfGuardUtil {
  static async assertPublicHost(url: string): Promise<void> {
    const hostname = new URL(url).hostname;
    const ip = isIP(hostname) ? hostname : (await lookup(hostname)).address;

    if (this.isPrivateOrReservedIp(ip)) {
      throw new SsrfBlockedError(hostname, ip);
    }
  }

  private static isPrivateOrReservedIp(ip: string): boolean {
    if (isIP(ip) === 4) return this.isPrivateIpv4(ip);
    if (isIP(ip) === 6) return this.isPrivateIpv6(ip);
    return true;
  }

  private static isPrivateIpv4(ip: string): boolean {
    const [a, b] = ip.split('.').map(Number);

    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local, includes the 169.254.169.254 cloud metadata endpoint
    if (a === 0) return true; // "this" network
    if (a >= 224) return true; // multicast and reserved
    return false;
  }

  private static isPrivateIpv6(ip: string): boolean {
    const normalized = ip.toLowerCase();

    if (normalized === '::1') return true; // loopback
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local, fc00::/7
    if (normalized.startsWith('fe80')) return true; // link-local, fe80::/10
    if (normalized.startsWith('::ffff:')) return this.isPrivateIpv4(normalized.slice('::ffff:'.length)); // IPv4-mapped
    return false;
  }
}
