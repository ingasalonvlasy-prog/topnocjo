"use client";

import { useEffect } from "react";
import { trackProductView } from "./RecentlyViewed";

export function TrackProductView({ productId }: { productId: string }) {
  useEffect(() => {
    trackProductView(productId);
  }, [productId]);

  return null;
}
