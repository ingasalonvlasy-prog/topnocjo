"use client";

import { useEffect } from "react";
import { trackProductView } from "./RecentlyViewed";
import { trackViewItem, type GA4Item } from "@/lib/analytics";

interface Props {
  productId: string;
  ga4Item?: GA4Item;
  value?: number;
}

export function TrackProductView({ productId, ga4Item, value }: Props) {
  useEffect(() => {
    trackProductView(productId);
    if (ga4Item && value != null) {
      trackViewItem(ga4Item, value);
    }
  }, [productId, ga4Item, value]);

  return null;
}
