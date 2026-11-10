import Image from "next/image";
import type { InstagramPost } from "@/lib/instagram";

export function InstagramGrid({ posts }: { posts: InstagramPost[] }) {
  if (posts.length > 0) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square rounded-[10px] overflow-hidden bg-wash"
          >
            <Image
              src={post.mediaUrl}
              alt={post.caption?.slice(0, 100) || "Instagram post"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 33vw, 16vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </a>
        ))}
      </div>
    );
  }

  // Fallback — SVG placeholders (same as current)
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <a
          key={i}
          href="https://instagram.com/qsport.cz"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative aspect-square rounded-[10px] overflow-hidden bg-wash"
        >
          <div className="w-full h-full flex items-center justify-center text-muted/30">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
        </a>
      ))}
    </div>
  );
}
