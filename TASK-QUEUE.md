# TASK-QUEUE — Qsport.cz vlastní e-shop

## AKTIVNÍ

## TASK-021: Shopify → SQLite data migration
Priorita: 1
Stav: čeká
Projekt: /Users/zen/qsport

### Kompletní zadání:
Stáhnout všech 14 728 produktů z Shopify API (zt2xr1-ry.myshopify.com) a naimportovat do lokální SQLite databáze. Zahrnuje: produkty, varianty, značky, kategorie, fotky, SEO data. Potřeba nejdřív získat/ověřit Shopify API token.

### Kontext:
- Store: zt2xr1-ry.myshopify.com
- API verze: 2024-01
- Starý token (shpat_a9d54...c22) byl revokován
- Schema: prisma/schema.prisma (Brand, Category, Product, Variant, ProductCategory)
- 59 kolekcí, 14 728 produktů

---

## TASK-022: Vizuální opravy podle brand briefu
Priorita: 1
Stav: čeká
Projekt: /Users/zen/qsport

### Kompletní zadání:
Dokončit pixel-perfect implementaci podle návrhů v .brand/navrh/navrh-webu/. Opravit: logo SVG v headeru (ověřit renderování), produktové karty bez fotek, hero banner s "Venku je tvoje hřiště.", kategorie grid s ikonami z public/icons/.

### Kontext:
- Návrhy: .brand/navrh/navrh-webu/ (web-home.png, web-produkt.png, web-kategorie.png, web-mobil.png)
- Brand brief: .claude-context/tasks/qsport-brand-brief.md
- Logo: public/qsport-logo-web.svg, public/qsport-logo-web-bila.svg
- Ikony: public/icons/*.svg

---

## BACKLOG

## TASK-023: Blog sekce
Priorita: 2
Stav: čeká

### Kompletní zadání:
Přidat blog sekci do e-shopu. Seznam článků, detail článku, kategorie/tagy, SEO, WYSIWYG editor v adminu.

## TASK-024: Košík + checkout
Priorita: 2
Stav: čeká

### Kompletní zadání:
Implementovat košík (session/localStorage), checkout formulář, Comgate platební bránu, GLS dopravu.

---

## ČEKÁ

---

## HOTOVÉ
