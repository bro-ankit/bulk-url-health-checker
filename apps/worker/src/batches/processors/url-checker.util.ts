import { BATCH_CONSTANTS } from '@bulk-url-health-checker/shared-contracts';
import { SsrfGuardUtil } from '../../security/ssrf-guard.util';

type UrlCheckResult = {
  httpStatusCode: number;
  responseTimeMs: number;
  pageTitle: string | null;
};

export class UrlCheckerUtil {
  private static TITLE_PATTERN = /<title[^>]*>([^<]*)<\/title>/i;

  static async check(url: string): Promise<UrlCheckResult> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BATCH_CONSTANTS.CHECK_TIMEOUT_MS);

    try {
      const response = await this.fetchFollowingSafeRedirects(url, controller.signal);
      const responseTimeMs = Date.now() - startedAt;
      const pageTitle = await this.extractTitle(response);

      return { httpStatusCode: response.status, responseTimeMs, pageTitle };
    } finally {
      clearTimeout(timeout);
    }
  }

  private static async fetchFollowingSafeRedirects(url: string, signal: AbortSignal): Promise<Response> {
    let currentUrl = url;

    for (let hop = 0; hop <= BATCH_CONSTANTS.MAX_REDIRECTS; hop++) {
      await SsrfGuardUtil.assertPublicHost(currentUrl);
      const response = await fetch(currentUrl, { signal, redirect: 'manual' });

      if (response.status < 300 || response.status >= 400 || !response.headers.get('location')) {
        return response;
      }

      currentUrl = new URL(response.headers.get('location') as string, currentUrl).toString();
    }

    throw new Error(`Too many redirects, exceeded ${BATCH_CONSTANTS.MAX_REDIRECTS}`);
  }

  private static async extractTitle(response: Response): Promise<string | null> {
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') || !response.body) return null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let scannedBytes = 0;
    let buffer = '';

    try {
      while (scannedBytes < BATCH_CONSTANTS.MAX_TITLE_SCAN_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;

        scannedBytes += value.byteLength;
        buffer += decoder.decode(value, { stream: true });

        const match = this.TITLE_PATTERN.exec(buffer);
        if (match) return match[1].trim();
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }

    return null;
  }
}
