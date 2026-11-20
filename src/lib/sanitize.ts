import sanitize from "sanitize-html";

export function sanitizeHtml(html: string): string {
  return sanitize(html, {
    allowedTags: sanitize.defaults.allowedTags.concat([
      "img", "iframe", "h1", "h2", "h3", "h4", "h5", "h6",
      "figure", "figcaption", "video", "source", "picture",
    ]),
    allowedAttributes: {
      ...sanitize.defaults.allowedAttributes,
      img: ["src", "alt", "width", "height", "loading", "class"],
      iframe: ["src", "width", "height", "allowfullscreen", "frameborder", "allow"],
      a: ["href", "target", "rel", "class"],
      "*": ["class", "style"],
    },
    allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],
  });
}
