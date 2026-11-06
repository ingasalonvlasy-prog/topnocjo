import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/pokladna", "/kosik", "/hledat"],
      },
    ],
    sitemap: "https://qsport.cz/sitemap.xml",
  };
}
