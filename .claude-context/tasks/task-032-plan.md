# Plán: TASK-032 — Admin blog WYSIWYG

**Priorita:** 2
**Soubory k úpravě:**
- `src/app/(admin)/admin/blog/[id]/page.tsx` (308 řádků) — edit
- `src/app/(admin)/admin/blog/novy/page.tsx` (286 řádků) — create
- Nová komponenta: `src/components/admin/WysiwygEditor.tsx`

**Referenční soubory (READ ONLY):**
- `src/app/(admin)/admin/blog/page.tsx` (145 řádků) — list
- `src/lib/blog-constants.ts` — sections, sport tags
- `prisma/schema.prisma` — BlogPost model
- `src/app/(public)/blog/` — public blog pages

---

## Analýza stávajícího stavu

### Co je hotovo (80%):

1. **Blog CRUD** — vytvoření, editace, smazání článků funguje
2. **Seznam článků** — toggle published, delete, section badges, sport tags
3. **Formulář** — title, slug (auto-generate), excerpt, content, cover image, author, tags, section, sport tags, meta description, sources JSON, related products, event calendar fields, published checkbox
4. **Public stránky** — `/blog` list + `/blog/[slug]` detail existují
5. **Sekce systém** — NOVINKY, RECENZE_PRODUKTU, TIPY_A_TRIKY, ROZHOVORY, KALENDAR_AKCI
6. **Sport rubriky** — beh, hory-outdoor, zima, obleceni, doplnky

### BlogPost model:
```prisma
model BlogPost {
  id              String    @id @default(cuid())
  title           String
  slug            String    @unique
  excerpt         String?
  content         String    // HTML content
  coverImage      String?
  author          String    @default("Qsport.cz")
  tags            String    @default("[]")
  published       Boolean   @default(false)
  publishedAt     DateTime?
  section         String    @default("NOVINKY")
  sportTags       String    @default("[]")
  metaDescription String?
  sources         String    @default("[]")
  relatedProducts String    @default("[]")
  eventDate       DateTime?
  eventLocation   String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  @@map("blog_posts")
}
```

### Hlavní problém:
- **Content pole je plain HTML `<textarea>`** — žádné formátování, žádný preview
- Zadání vyžaduje WYSIWYG editor

---

## Problém: Plain textarea místo WYSIWYG editoru

### Aktuální stav (oba soubory):
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Obsah (HTML)</label>
  <textarea
    name="content"
    rows={16}
    defaultValue={post.content}  // nebo "" pro novy
    required
    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono ..."
  />
</div>
```

### Řešení — TipTap WYSIWYG editor:

**Výběr editoru:** TipTap (open-source, React-native, headless UI)
- Má React wrapper `@tiptap/react`
- Extensions: Bold, Italic, Heading, Link, BulletList, OrderedList, Image, Blockquote
- Výstup: HTML string — kompatibilní s aktuálním `content` polem
- Žádná external CDN dependency

### Instalace:

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-underline @tiptap/pm
```

### Nový soubor: `src/components/admin/WysiwygEditor.tsx`

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { useState, useEffect } from "react";

interface WysiwygEditorProps {
  name: string;       // form field name
  defaultValue: string;
  required?: boolean;
}

function MenuBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const btnCls = (active: boolean) =>
    `px-2 py-1 text-xs font-medium rounded transition-colors ${
      active
        ? "bg-gray-900 text-white"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-md">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnCls(editor.isActive("bold"))}>B</button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnCls(editor.isActive("italic"))}>I</button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btnCls(editor.isActive("underline"))}>U</button>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnCls(editor.isActive("heading", { level: 2 }))}>H2</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnCls(editor.isActive("heading", { level: 3 }))}>H3</button>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnCls(editor.isActive("bulletList"))}>• List</button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnCls(editor.isActive("orderedList"))}>1. List</button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnCls(editor.isActive("blockquote"))}>Quote</button>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => {
        const url = window.prompt("URL odkazu:");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      }} className={btnCls(editor.isActive("link"))}>Link</button>

      <button type="button" onClick={() => {
        const url = window.prompt("URL obrázku:");
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }} className={btnCls(false)}>Img</button>

      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btnCls(false)}>—</button>
    </div>
  );
}

export function WysiwygEditor({ name, defaultValue, required }: WysiwygEditorProps) {
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({ openOnClick: false }),
      Image,
      Underline,
    ],
    content: defaultValue,
    onUpdate: ({ editor }) => {
      setHtml(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none px-4 py-3 min-h-[300px] focus:outline-none",
      },
    },
  });

  return (
    <div>
      {/* Hidden input pro form submission */}
      <input type="hidden" name={name} value={html} />

      <div className="border border-gray-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <MenuBar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
```

### Prose CSS — zajistit styling obsahu:

V admin layoutu nebo globálním CSS přidat basic prose styles (pokud není `@tailwindcss/typography`):

```css
/* V src/app/(admin)/admin/layout.tsx nebo globals */
.prose h2 { font-size: 1.25rem; font-weight: 700; margin: 1.5em 0 0.5em; }
.prose h3 { font-size: 1.1rem; font-weight: 600; margin: 1.25em 0 0.5em; }
.prose p { margin: 0.5em 0; }
.prose ul { list-style: disc; padding-left: 1.5em; }
.prose ol { list-style: decimal; padding-left: 1.5em; }
.prose blockquote { border-left: 3px solid #d1d5db; padding-left: 1em; color: #6b7280; }
.prose a { color: #2563eb; text-decoration: underline; }
.prose img { max-width: 100%; border-radius: 0.375rem; margin: 1em 0; }
.prose hr { border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
```

**Alternativa:** Instalovat `@tailwindcss/typography` plugin — ale to může být overkill pro jednu komponentu.

---

## Integrace do formulářů

### Soubor: `src/app/(admin)/admin/blog/[id]/page.tsx`

Nahradit textarea za WysiwygEditor. Protože WysiwygEditor je "use client" ale stránka je server component, je potřeba:

```diff
+ import { WysiwygEditor } from "@/components/admin/WysiwygEditor";
...
- <div>
-   <label className="block text-sm font-medium text-gray-700 mb-1">Obsah (HTML)</label>
-   <textarea
-     name="content"
-     rows={16}
-     defaultValue={post.content}
-     required
-     className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
-   />
- </div>
+ <div>
+   <label className="block text-sm font-medium text-gray-700 mb-1">Obsah</label>
+   <WysiwygEditor name="content" defaultValue={post.content} required />
+ </div>
```

### Soubor: `src/app/(admin)/admin/blog/novy/page.tsx`

Stejná změna:

```diff
+ import { WysiwygEditor } from "@/components/admin/WysiwygEditor";
...
- <div>
-   <label className="block text-sm font-medium text-gray-700 mb-1">Obsah (HTML)</label>
-   <textarea
-     name="content"
-     rows={16}
-     defaultValue=""
-     required
-     className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
-   />
- </div>
+ <div>
+   <label className="block text-sm font-medium text-gray-700 mb-1">Obsah</label>
+   <WysiwygEditor name="content" defaultValue="" required />
+ </div>
```

---

## Volitelné vylepšení (nízká priorita):

### 1. HTML source mode toggle
Přidat tlačítko "HTML" do MenuBar, které přepne mezi WYSIWYG a raw textarea:

```tsx
const [sourceMode, setSourceMode] = useState(false);
// V MenuBar:
<button type="button" onClick={() => setSourceMode(!sourceMode)}
  className={btnCls(sourceMode)}>{"</>"} HTML</button>
// V renderování:
{sourceMode ? (
  <textarea value={html} onChange={(e) => { setHtml(e.target.value); editor?.commands.setContent(e.target.value); }}
    className="w-full px-4 py-3 min-h-[300px] text-sm font-mono" />
) : (
  <EditorContent editor={editor} />
)}
```

### 2. Image upload (ne URL)
Aktuálně obrázky přes URL prompt. Pro upload by se vyžadovalo:
- Upload API endpoint (`/api/upload`)
- S3/R2 storage nebo local `/public/uploads/`
- **ODLOŽIT** na budoucí iteraci

### 3. Auto-save draft
Ukládat draft do localStorage per slug — zabránit ztrátě obsahu při navigaci pryč.

---

## Shrnutí implementačních kroků

| # | Soubor | Změna | Řádků |
|---|--------|-------|-------|
| 1 | `npm install` | TipTap packages (5 balíčků) | — |
| 2 | `src/components/admin/WysiwygEditor.tsx` | NOVÝ — editor s toolbarem | ~120 |
| 3 | `admin/blog/[id]/page.tsx` | Nahradit textarea za WysiwygEditor | ~4 (replace) |
| 4 | `admin/blog/novy/page.tsx` | Nahradit textarea za WysiwygEditor | ~4 (replace) |
| 5 | CSS prose styles | V admin layout nebo globals | ~15 |

**Celkem:** ~140 řádků nového kódu, 2 existující soubory + 1 nový + CSS

---

## Závislosti
- **npm packages:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-underline`, `@tiptap/pm`
- Žádné závislosti na jiné tasky
- Výstup editoru je HTML string — 100% kompatibilní se stávajícím `content` polem v DB

---

## Rizika
- TipTap bundle size (~40-60 KB gzipped) — jen v admin, nepůsobí na veřejný frontend
- Server component import — WysiwygEditor je "use client", ale import do server component stránky funguje standardně v Next.js
- Prose styling — může kolidovat s existujícím CSS, potřeba scope na `.prose` class
