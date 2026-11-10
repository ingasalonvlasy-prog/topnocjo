export interface InstagramPost {
  id: string;
  mediaUrl: string;
  permalink: string;
  caption?: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  timestamp: string;
}

let cachedPosts: InstagramPost[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getInstagramPosts(count = 6): Promise<InstagramPost[]> {
  const now = Date.now();

  if (cachedPosts && now - cacheTimestamp < CACHE_TTL) {
    return cachedPosts.slice(0, count);
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    return [];
  }

  try {
    const url = `https://graph.instagram.com/me/media?fields=id,media_url,permalink,caption,media_type,thumbnail_url,timestamp&limit=${count}&access_token=${token}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.error("Instagram API error:", res.status);
      return [];
    }

    const data = await res.json();
    const posts: InstagramPost[] = (data.data || []).map((p: Record<string, string>) => ({
      id: p.id,
      mediaUrl: p.media_type === "VIDEO" ? p.thumbnail_url || p.media_url : p.media_url,
      permalink: p.permalink,
      caption: p.caption,
      mediaType: p.media_type,
      timestamp: p.timestamp,
    }));

    cachedPosts = posts;
    cacheTimestamp = now;

    return posts.slice(0, count);
  } catch (err) {
    console.error("Instagram fetch failed:", err);
    return [];
  }
}
