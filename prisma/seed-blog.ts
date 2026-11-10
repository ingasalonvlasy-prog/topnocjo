import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Upsert — skip existing slugs, add new ones
  const posts = [
      {
        title: "Skipasy 2026/27: kolik letos zaplatíš na horách",
        slug: "skipasy-2026-27-kolik-letos-zaplatis",
        excerpt: "Přehled cen skipasů v Česku i zahraničí na sezónu 2026/27.",
        content: "<h2>Česko</h2><p>Ceny skipasů v českých střediscích pro sezónu 2026/27 vzrostly průměrně o 8 %. Špindlerův Mlýn nabízí denní skipas za 1 490 Kč, Pec pod Sněžkou za 1 350 Kč.</p><h2>Rakousko</h2><p>Stubaier Gletscher startuje na 67 EUR za den, Sölden na 72 EUR. Týdenní balíčky se vyplatí od 4 dnů výše.</p><h2>Itálie</h2><p>Dolomiti Superski nabízí 6denní skipas za 350 EUR — jeden z nejlepších poměrů cena/kilometry sjezdovek v Alpách.</p>",
        author: "Qsport.cz",
        tags: JSON.stringify(["lyže", "skipasy", "zima"]),
        section: "NOVINKY",
        sportTags: JSON.stringify(["lyze-a-snowboard"]),
        metaDescription: "Přehled cen skipasů v Česku, Rakousku a Itálii na sezónu 2026/27. Ceny ověřené k listopadu 2026.",
        sources: JSON.stringify([]),
        relatedProducts: JSON.stringify([]),
        published: true,
        publishedAt: new Date("2026-11-07"),
      },
      {
        title: "Jak se obléct na svah: 5 věcí, na kterých záleží",
        slug: "jak-se-oblect-na-svah",
        excerpt: "Vrstvení na hory není věda. Tady je 5 pravidel, co fungují.",
        content: "<h2>1. Spodní vrstva: žádná bavlna</h2><p>Merino vlna nebo syntetika. Bavlna drží vlhkost a chladí.</p><h2>2. Střední vrstva: fleece nebo primaloft</h2><p>Izolační vrstva, která drží teplo, i když se zpotíte.</p><h2>3. Svrchní vrstva: membrána</h2><p>Gore-Tex nebo podobná membrána. Chrání před větrem a sněhem, propouští páru.</p><h2>4. Rukavice: palcáky &gt; prsťáky</h2><p>Palcáky jsou teplejší. Na sjezdovku ideální.</p><h2>5. Helma: povinnost, ne volba</h2><p>Moderní helmy jsou lehké a větrané. Bez helmy na svah nepatříte.</p>",
        author: "Qsport.cz",
        tags: JSON.stringify(["lyže", "oblečení", "vrstvení"]),
        section: "TIPY_NAVODY",
        sportTags: JSON.stringify(["lyze-a-snowboard", "obleceni-a-vrstvy"]),
        metaDescription: "Jak se správně obléct na lyže a snowboard. 5 zásad vrstvení, které ti ušetří peníze i komfort.",
        sources: JSON.stringify([]),
        relatedProducts: JSON.stringify([]),
        published: true,
        publishedAt: new Date("2026-11-05"),
      },
      {
        title: "5 nejlepších běžeckých tras kolem Prahy",
        slug: "5-nejlepsich-bezeckych-tras-kolem-prahy",
        excerpt: "Kam vyrazit běhat, když chceš z města ven, ale nemáš čas na výlet.",
        content: "<h2>1. Divoká Šárka</h2><p>Terénní profil, stíny, voda. Okruh 5–8 km dle varianty. Ideální na trail.</p><h2>2. Prokopské údolí</h2><p>Singletrack podél potoka, převýšení kolem 100 m. Délka 6 km tam a zpět.</p><h2>3. Kunratický les</h2><p>Klasika pro běžce z jihu Prahy. Měkký povrch, osvětlené úseky večer.</p><h2>4. Hostivařská přehrada</h2><p>Rovinatý okruh 3,5 km kolem přehrady. Dobrý pro tempo tréninky.</p><h2>5. Stromovka → Troja</h2><p>Podél Vltavy, asfalt i štěrk. Možnost prodloužení až do Roztok.</p>",
        author: "Qsport.cz",
        tags: JSON.stringify(["běh", "Praha", "trasy"]),
        section: "KAM_VYRAZIT",
        sportTags: JSON.stringify(["beh", "outdoor-a-turistika"]),
        metaDescription: "5 nejlepších běžeckých tras kolem Prahy. Divoká Šárka, Prokopské údolí, Kunratický les a další.",
        sources: JSON.stringify([]),
        relatedProducts: JSON.stringify([]),
        published: true,
        publishedAt: new Date("2026-11-03"),
      },
      {
        title: "On Cloudmonster vs Cloudsurfer: který na každý den",
        slug: "cloudmonster-vs-cloudsurfer",
        excerpt: "Dva nejprodávanější modely On ve srovnání. Který je pro tebe?",
        content: "<h2>Cloudmonster</h2><p>Maximální odpružení, vyšší drop (6 mm), váha 245 g. Ideální na dlouhé výběhy a asfalt. CloudTec fáze je delší — pocit houpání.</p><h2>Cloudsurfer</h2><p>Univerzálnější, nižší profil, váha 280 g. Helion superfoam v mezipodešvi. Stabilnější v zatáčkách, lepší na tempo běhy.</p><h2>Verdikt</h2><p>Cloudmonster = pohodlí na dlouhé vzdálenosti. Cloudsurfer = univerzál na každý den, rychlejší odezva.</p>",
        author: "Qsport.cz",
        tags: JSON.stringify(["běh", "On", "srovnání"]),
        section: "TESTY_SROVNANI",
        sportTags: JSON.stringify(["beh"]),
        metaDescription: "On Cloudmonster vs Cloudsurfer – porovnání dvou nejprodávanějších běžeckých bot On. Odpružení, váha, povrch, cena.",
        sources: JSON.stringify([]),
        relatedProducts: JSON.stringify(["on-cloudmonster", "on-cloudsurfer"]),
        published: true,
        publishedAt: new Date("2026-11-01"),
      },
      {
        title: "RunCzech Praha Marathon 2027 — registrace otevřena",
        slug: "runczech-praha-marathon-2027",
        excerpt: "Pražský maraton 2027 se blíží. Start i cíl na Staroměstském náměstí.",
        content: "<h2>Kdy a kde</h2><p>4. května 2027, start 9:00, Staroměstské náměstí Praha. Trasa vede přes Karlův most, Letnou a podél Vltavy.</p><h2>Kategorie</h2><p>Maraton (42,195 km), půlmaraton (21,1 km), štafeta (4×~10 km). Registrace od 1 200 Kč.</p><h2>Příprava</h2><p>16–20 týdnů tréninku pro maraton, 10–12 týdnů pro půlmaraton. Doporučujeme začít nejpozději v lednu.</p>",
        author: "Qsport.cz",
        tags: JSON.stringify(["běh", "maraton", "Praha"]),
        section: "KALENDAR_AKCI",
        sportTags: JSON.stringify(["beh"]),
        metaDescription: "Pražský maraton 2027 — termín, registrace, kategorie. RunCzech Prague Marathon 4. května 2027.",
        sources: JSON.stringify([{ title: "RunCzech.com", url: "https://www.runczech.com" }]),
        relatedProducts: JSON.stringify([]),
        eventDate: new Date("2027-05-04"),
        eventLocation: "Praha · Staroměstské náměstí",
        published: true,
        publishedAt: new Date("2026-10-28"),
      },
      {
        title: "POC Obex MIPS: nová helma na zimu 2026/27",
        slug: "poc-obex-mips-nova-helma-zima-2026",
        excerpt: "POC přichází s novou generací helmy Obex. Co je nového?",
        content: "<h2>MIPS Integra</h2><p>Nová generace MIPS rotačního systému integrovaná přímo do EPS pěny. Tenčí profil, lepší ventilace.</p><h2>Váha a komfort</h2><p>380 g ve velikosti M/L. Nastavitelný BOA fit systém pro přesné dosednutí.</p><h2>Cena</h2><p>Doporučená cena 3 490 Kč. V Qsportu od listopadu 2026.</p>",
        author: "Qsport.cz",
        tags: JSON.stringify(["helma", "POC", "zima"]),
        section: "NOVINKY",
        sportTags: JSON.stringify(["lyze-a-snowboard", "helmy-a-ochrana"]),
        metaDescription: "POC Obex MIPS helma 2026/27 — MIPS Integra, 380 g, BOA fit. Recenze a cena v Qsportu.",
        sources: JSON.stringify([]),
        relatedProducts: JSON.stringify([]),
        published: true,
        publishedAt: new Date("2026-10-25"),
      },
  ];

  let created = 0;
  for (const post of posts) {
    const exists = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    if (!exists) {
      await prisma.blogPost.create({ data: post });
      created++;
      console.log(`Created: ${post.slug}`);
    } else {
      // Update existing post with new fields
      await prisma.blogPost.update({
        where: { slug: post.slug },
        data: {
          section: post.section,
          sportTags: post.sportTags,
          metaDescription: post.metaDescription,
          sources: post.sources,
          relatedProducts: post.relatedProducts,
          eventDate: post.eventDate || null,
          eventLocation: post.eventLocation || null,
        },
      });
      console.log(`Updated: ${post.slug}`);
    }
  }
  console.log(`Done. Created ${created}, updated ${posts.length - created}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
