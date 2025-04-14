import { Redis } from '@upstash/redis';

const kvRedis = new Redis({
  url: process.env.VK_REDIS_KV_REST_API_URL,
  token: process.env.VK_REDIS_KV_REST_API_TOKEN,
});

export async function getDataFromRedis(
  key: string,
  url: string,
  revalidate: number,
) {
  if (url.includes('no_cache=true')) {
    // force no cache
    return null;
  }
  const cacheData: any = await kvRedis.get(key);
  if (
    cacheData &&
    new Date().getTime() - new Date(cacheData.lastUpdated).getTime() <
      revalidate * 1000
  ) {
    console.log(`Cache hit for ${key}`);
    return cacheData;
  }

  return null;
}

export default kvRedis;
