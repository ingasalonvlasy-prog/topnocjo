import { Text, Section, Link, Hr } from "@react-email/components";
import { EmailLayout } from "./layout";

interface ReviewInvitationProps {
  orderNumber: string;
  firstName: string;
  items: Array<{ name: string; slug: string }>;
}

export function ReviewInvitation({ orderNumber, firstName, items }: ReviewInvitationProps) {
  return (
    <EmailLayout preview={`Jak jste spokojeni s objednávkou #${orderNumber}?`}>
      <Text style={{ fontSize: "16px", color: "#333", margin: "0 0 16px" }}>
        Dobrý den, {firstName},
      </Text>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        Vaše objednávka #{orderNumber} byla doručena. Budeme rádi za vaše hodnocení zakoupených produktů:
      </Text>

      {items.slice(0, 5).map((item) => (
        <Section key={item.slug} style={{ marginBottom: "8px" }}>
          <Link
            href={`https://qsport.cz/produkt/${item.slug}#recenze`}
            style={{
              display: "block",
              backgroundColor: "#0B1727",
              color: "#CEFF2F",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: "bold",
              textAlign: "center" as const,
            }}
          >
            Ohodnotit: {item.name.length > 45 ? item.name.slice(0, 45) + "..." : item.name}
          </Link>
        </Section>
      ))}

      <Hr style={{ borderColor: "#e4e4e7", margin: "24px 0" }} />

      <Text style={{ fontSize: "13px", color: "#666", margin: 0 }}>
        Vaše zpětná vazba nám pomáhá zlepšovat nabídku. Děkujeme!
      </Text>
    </EmailLayout>
  );
}
