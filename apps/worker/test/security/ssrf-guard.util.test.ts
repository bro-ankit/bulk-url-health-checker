import { SsrfBlockedError, SsrfGuardUtil } from '../../src/security/ssrf-guard.util';

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock('node:dns/promises', () => ({ lookup: lookupMock }));

describe('Given SsrfGuardUtil.assertPublicHost', () => {
  beforeEach(() => {
    lookupMock.mockReset();
  });

  describe.each([
    { label: 'a public IPv4 address', ip: '93.184.216.34', family: 4 },
    { label: 'a public IPv6 address', ip: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
  ])('When the hostname resolves to $label', ({ ip, family }) => {
    test('Then it resolves without throwing', async () => {
      lookupMock.mockResolvedValue({ address: ip, family });

      await expect(SsrfGuardUtil.assertPublicHost('https://example.com/page')).resolves.toBeUndefined();
    });
  });

  describe.each([
    { label: 'the cloud metadata link-local address', ip: '169.254.169.254', family: 4 },
    { label: 'a loopback address', ip: '127.0.0.1', family: 4 },
    { label: 'an RFC1918 10/8 address', ip: '10.0.0.5', family: 4 },
    { label: 'an RFC1918 172.16/12 address', ip: '172.20.0.5', family: 4 },
    { label: 'an RFC1918 192.168/16 address', ip: '192.168.1.1', family: 4 },
    { label: 'an IPv6 loopback address', ip: '::1', family: 6 },
  ])('When the hostname resolves to $label', ({ ip, family }) => {
    test('Then it throws SsrfBlockedError', async () => {
      lookupMock.mockResolvedValue({ address: ip, family });

      await expect(SsrfGuardUtil.assertPublicHost('https://internal.example/x')).rejects.toThrow(SsrfBlockedError);
    });
  });

  describe('When the URL is already a literal private IPv4 address', () => {
    test('Then it throws SsrfBlockedError without calling dns.lookup', async () => {
      await expect(SsrfGuardUtil.assertPublicHost('http://127.0.0.1:8080/x')).rejects.toThrow(SsrfBlockedError);
      expect(lookupMock).not.toHaveBeenCalled();
    });
  });
});
