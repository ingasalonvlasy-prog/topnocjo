"use client";

import { useEffect, useRef } from "react";
import { trackPurchase, type GA4Item } from "@/lib/analytics";

interface Props {
  transactionId: string;
  value: number;
  shipping: number;
  discount?: number;
  coupon?: string;
  items: GA4Item[];
}

export function TrackPurchase(props: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackPurchase(props);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
