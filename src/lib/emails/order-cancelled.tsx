import { Text, Section, Link } from "@react-email/components";
import { EmailLayout } from "./layout";

interface OrderCancelledProps {
  orderNumber: string;
  firstName: string;
  total: number;
  wasPaid: boolean;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + "\u00A0Kč";
}

export function OrderCancelled({ orderNumber, firstName, total, wasPaid }: OrderCancelledProps) {
  return (
    <EmailLayout preview={`Objednávka ${orderNumber} byla zrušena`}>
      <Text style={{ fontSize: "16px", color: "#333", margin: "0 0 16px" }}>
        Dobrý den, {firstName},
      </Text>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        Vaše objednávka byla zrušena.
      </Text>

      {/* Order info */}
      <Section style={{ backgroundColor: "#FFF5F5", padding: "16px", borderRadius: "6px", border: "1px solid #FFD4D4", marginBottom: "20px" }}>
        <Text style={{ fontSize: "12px", color: "#666", margin: "0 0 4px" }}>Objednávka</Text>
        <Text style={{ fontSize: "18px", fontWeight: "bold", color: "#0B1727", margin: "0 0 8px", fontFamily: "monospace" }}>
          #{orderNumber}
        </Text>
        <Text style={{ fontSize: "14px", color: "#333", margin: 0 }}>
          Částka: {formatPrice(total)}
        </Text>
      </Section>

      {wasPaid && (
        <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
          Zaplacená částka Vám bude vrácena na původní platební metodu. Vrácení může trvat až 14 pracovních dní.
        </Text>
      )}

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        Pokud máte jakékoliv dotazy, neváhejte nás kontaktovat na{" "}
        <Link href="mailto:info@qsport.cz" style={{ color: "#0B1727" }}>info@qsport.cz</Link>.
      </Text>

      {/* CTA */}
      <Section style={{ textAlign: "center" as const }}>
        <Link
          href="https://qsport.cz"
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
          Zpět na Qsport.cz
        </Link>
      </Section>
    </EmailLayout>
  );
}
