import { getHosturl } from '@/utils';
import { logErrorOnce } from '@/utils/errorLog';

async function fetchWithRetry(
  url: string,
  options: any = {},
  errorToast: string = 'Failed to fetch',
): Promise<Response | null> {
  const maxRetries = 3;
  const baseDelay = 1000;

  const urlPrefix =
    typeof window === 'undefined' && !url.includes('http')
      ? process.env.HOSTNAME || `https://app.${getHosturl()}`
      : '';

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${urlPrefix}${url}`, options);
      if (response.ok) {
        return response;
      }
      // 4xx are client errors (malformed/unauthorized request) — retrying will
      // never succeed, so fail fast instead of hammering the endpoint. 429
      // (rate limited) is the exception: it IS worth backing off and retrying.
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      ) {
        logErrorOnce(
          `fetch:${url}:${response.status}`,
          `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
        );
        return null;
      }
      throw new Error(`Failed to fetch ${url}, ${response.statusText}`, {
        cause: response.status,
      });
    } catch (error) {
      if (i === maxRetries - 1) {
        logErrorOnce(`fetch:${url}`, `Error fetching ${url} : `, error);
        // toast.error(errorToast, {
        //   position: 'bottom-right',
        // });
        return null;
      }
      // Exponential backoff (1s, 2s, 4s …) so a struggling endpoint gets room
      // to recover instead of three rapid-fire hits.
      await new Promise((resolve) => setTimeout(resolve, baseDelay * 2 ** i));
    }
  }
  return null;
}

export default fetchWithRetry;
