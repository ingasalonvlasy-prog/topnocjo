const SITE_URL = "https://qsport.cz";
const SITE_NAME = "Qsport.cz";

interface BreadcrumbItem {
  name: string;
  url?: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Domů", item: SITE_URL },
      ...items.map((item, i) => ({
        "@type": "ListItem" as const,
        position: i + 2,
        name: item.name,
        ...(item.url ? { item: `${SITE_URL}${item.url}` } : {}),
      })),
    ],
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    sameAs: ["https://instagram.com/qsport.cz"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "Czech",
    },
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/hledat?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

interface ProductJsonLdInput {
  name: string;
  description: string | null;
  slug: string;
  photos: string[];
  brandName: string;
  variants: {
    title: string;
    price: number;
    sku: string | null;
    availability: "in_stock" | "on_order" | "out_of_stock";
  }[];
  reviewCount?: number;
  avgRating?: number;
}

export function buildProductJsonLd(product: ProductJsonLdInput) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.photos,
    url: `${SITE_URL}/produkt/${product.slug}`,
    brand: { "@type": "Brand", name: product.brandName },
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      name: v.title,
      price: (v.price / 100).toFixed(2),
      priceCurrency: "CZK",
      availability:
        v.availability === "in_stock"
          ? "https://schema.org/InStock"
          : v.availability === "on_order"
            ? "https://schema.org/BackOrder"
            : "https://schema.org/OutOfStock",
      sku: v.sku,
      url: `${SITE_URL}/produkt/${product.slug}`,
    })),
  };

  if (product.reviewCount && product.reviewCount > 0 && product.avgRating) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.avgRating.toFixed(1),
      bestRating: "5",
      worstRating: "1",
      reviewCount: product.reviewCount,
    };
  }

  return data;
}
