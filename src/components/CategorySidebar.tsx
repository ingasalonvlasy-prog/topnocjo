"use client";

import Link from "next/link";

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  currentSlug: string;
  parentCategory: CategoryNode;
  childCategories: CategoryNode[];
}

export function CategorySidebar({ currentSlug, parentCategory, childCategories }: Props) {
  return (
    <nav>
      <Link
        href={`/kategorie/${parentCategory.slug}`}
        className={`block text-[14px] font-bold mb-3 transition-colors ${
          currentSlug === parentCategory.slug ? "text-navy" : "text-ink hover:text-navy"
        }`}
      >
        {parentCategory.name}
      </Link>

      <ul className="space-y-1 border-l-2 border-line pl-4">
        {childCategories.map((cat) => (
          <li key={cat.id}>
            <Link
              href={`/kategorie/${cat.slug}`}
              className={`block text-[13px] py-1.5 transition-colors ${
                currentSlug === cat.slug
                  ? "text-navy font-bold border-l-2 border-navy -ml-[18px] pl-[16px]"
                  : "text-muted hover:text-ink font-medium"
              }`}
            >
              {cat.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
