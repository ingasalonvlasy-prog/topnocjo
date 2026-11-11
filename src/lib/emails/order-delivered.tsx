import { Text, Section, Link } from "@react-email/components";
import { EmailLayout } from "./layout";

interface OrderDeliveredProps {
  orderNumber: string;
  firstName: string;
  viewToken?: string;
}

export function OrderDelivered({ orderNumber, firstName, viewToken }: OrderDeliveredProps) {
  return (
    <EmailLayout preview={`Objednávka ${orderNumber} byla doručena`}>
      <Text style={{ fontSize: "16px", color: "#333", margin: "0 0 16px" }}>
        Dobrý den, {firstName},
      </Text>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        Vaše objednávka byla úspěšně doručena. Doufáme, že budete se zbožím spokojený/á!
      </Text>

      {/* Order info */}
      <Section style={{ backgroundColor: "#E8FFE8", padding: "16px", borderRadius: "6px", border: "1px solid #C0E8C0", marginBottom: "20px" }}>
        <Text style={{ fontSize: "12px", color: "#666", margin: "0 0 4px" }}>Objednávka</Text>
        <Text style={{ fontSize: "18px", fontWeight: "bold", color: "#0B1727", margin: "0 0 8px", fontFamily: "monospace" }}>
          {orderNumber}
        </Text>
        <Text style={{ fontSize: "13px", color: "#2D7D2D", margin: "0", fontWeight: "bold" }}>
          Doručeno
        </Text>
      </Section>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        Pokud máte jakékoliv dotazy nebo připomínky, neváhejte se na nás obrátit.
      </Text>

      <Section style={{ textAlign: "center" as const }}>
        <Link
          href={`https://qsport.cz/objednavka/${orderNumber}${viewToken ? `?token=${viewToken}` : ""}`}
          style={{
            display: "inline-block",
            backgroundColor: "#0B1727",
            color: "#CEFF2F",
            padding: "12px 28px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "bold",
            textDecoration: "none",
          }}
        >
          Zobrazit objednávku
        </Link>
      </Section>
    </EmailLayout>
  );
}
