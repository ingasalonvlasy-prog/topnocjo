import { Text, Section, Row, Column, Link, Hr } from "@react-email/components";
import { EmailLayout } from "./layout";

interface AbandonedItem {
  productName: string;
  variantTitle: string;
  quantity: number;
  unitPrice: number;
  photo?: string;
}

interface AbandonedCheckoutEmailProps {
  firstName?: string;
  email: string;
  items: AbandonedItem[];
  subtotal: number;
  recoveryUrl: string;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + "\u00A0Kč";
}

export function AbandonedCheckoutEmail({
  firstName,
  items,
  subtotal,
  recoveryUrl,
}: AbandonedCheckoutEmailProps) {
  return (
    <EmailLayout preview="Zapomněli jste něco v košíku?">
      <Text style={{ fontSize: "20px", fontWeight: "bold", color: "#0B1727", margin: "0 0 16px" }}>
        Zapomněli jste něco v košíku?
      </Text>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        Dobrý den{firstName ? `, ${firstName}` : ""}, všimli jsme si, že jste nedokončili objednávku. Vaše položky na vás stále čekají:
      </Text>

      {/* Items */}
      {items.map((item, i) => (
        <Row key={i} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
          <Column style={{ width: "60%", verticalAlign: "top" }}>
            <Text style={{ fontSize: "13px", color: "#333", margin: 0 }}>
              {item.productName}
            </Text>
            <Text style={{ fontSize: "11px", color: "#888", margin: "2px 0 0" }}>
              {item.variantTitle} &times; {item.quantity}
            </Text>
          </Column>
          <Column style={{ width: "40%", textAlign: "right" as const, verticalAlign: "top" }}>
            <Text style={{ fontSize: "13px", fontWeight: "bold", color: "#333", margin: 0 }}>
              {formatPrice(item.unitPrice * item.quantity)}
            </Text>
          </Column>
        </Row>
      ))}

      <Hr style={{ borderColor: "#ddd", margin: "16px 0" }} />

      {/* Total */}
      <Row>
        <Column>
          <Text style={{ fontSize: "16px", fontWeight: "bold", color: "#0B1727", margin: "4px 0" }}>Celkem</Text>
        </Column>
        <Column style={{ textAlign: "right" as const }}>
          <Text style={{ fontSize: "16px", fontWeight: "bold", color: "#0B1727", margin: "4px 0" }}>{formatPrice(subtotal)}</Text>
        </Column>
      </Row>

      <Hr style={{ borderColor: "#ddd", margin: "20px 0" }} />

      {/* CTA */}
      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Link
          href={recoveryUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#CEFF2F",
            color: "#0B1727",
            padding: "14px 32px",
            borderRadius: "24px",
            fontSize: "14px",
            fontWeight: "bold",
            textDecoration: "none",
            textTransform: "uppercase" as const,
            letterSpacing: "1px",
          }}
        >
          Dokončit objednávku
        </Link>
      </Section>

      <Text style={{ fontSize: "12px", color: "#999", margin: "24px 0 0", textAlign: "center" as const }}>
        Pokud si nepřejete dostávat tyto upomínky, tento email ignorujte.
      </Text>
    </EmailLayout>
  );
}
