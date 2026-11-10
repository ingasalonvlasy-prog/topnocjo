export const BLOG_SECTIONS = {
  NOVINKY: "NOVINKY",
  TIPY_NAVODY: "TIPY_NAVODY",
  KAM_VYRAZIT: "KAM_VYRAZIT",
  TESTY_SROVNANI: "TESTY_SROVNANI",
  KALENDAR_AKCI: "KALENDAR_AKCI",
} as const;

export type BlogSection = (typeof BLOG_SECTIONS)[keyof typeof BLOG_SECTIONS];

export const SECTION_LABELS: Record<BlogSection, string> = {
  NOVINKY: "Novinky",
  TIPY_NAVODY: "Tipy a návody",
  KAM_VYRAZIT: "Kam vyrazit",
  TESTY_SROVNANI: "Testy a srovnání",
  KALENDAR_AKCI: "Kalendář akcí",
};

export const SECTION_SLUGS: Record<BlogSection, string> = {
  NOVINKY: "novinky",
  TIPY_NAVODY: "tipy-a-navody",
  KAM_VYRAZIT: "kam-vyrazit",
  TESTY_SROVNANI: "testy-a-srovnani",
  KALENDAR_AKCI: "kalendar-akci",
};

export const SLUG_TO_SECTION: Record<string, BlogSection> = Object.fromEntries(
  Object.entries(SECTION_SLUGS).map(([k, v]) => [v, k as BlogSection])
) as Record<string, BlogSection>;

export const SECTION_COLORS: Record<BlogSection, { bg: string; text: string }> = {
  NOVINKY: { bg: "bg-navy", text: "text-white" },
  TIPY_NAVODY: { bg: "bg-mint", text: "text-navy" },
  KAM_VYRAZIT: { bg: "bg-blue", text: "text-white" },
  TESTY_SROVNANI: { bg: "bg-wash", text: "text-navy" },
  KALENDAR_AKCI: { bg: "bg-lime", text: "text-navy" },
};

export const SPORT_TAGS = [
  { slug: "beh", label: "Běh" },
  { slug: "trail-running", label: "Trail running" },
  { slug: "lyze-a-snowboard", label: "Lyže a snowboard" },
  { slug: "bezky", label: "Běžky" },
  { slug: "cyklistika", label: "Cyklistika" },
  { slug: "outdoor-a-turistika", label: "Outdoor a turistika" },
  { slug: "obleceni-a-vrstvy", label: "Oblečení a vrstvy" },
  { slug: "helmy-a-ochrana", label: "Helmy a ochrana" },
  { slug: "doplnky-a-prislusenstvi", label: "Doplňky a příslušenství" },
] as const;

export type SportTagSlug = (typeof SPORT_TAGS)[number]["slug"];
