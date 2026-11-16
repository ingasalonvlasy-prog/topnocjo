import { Text, Section, Link } from "@react-email/components";
import { EmailLayout } from "./layout";

interface PaymentReceivedProps {
  orderNumber: string;
  firstName: string;
  total: number;
  paidAt: string;
  viewToken?: string;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount / 100)) + "\u00A0Kč";
}

export function PaymentReceived({ orderNumber, firstName, total, paidAt, viewToken }: PaymentReceivedProps) {
  return (
    <EmailLayout preview={`Platba za objednávku ${orderNumber} přijata`}>
      <Text style={{ fontSize: "16px", color: "#333", margin: "0 0 16px" }}>
        Dobrý den, {firstName},
      </Text>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        Vaše platba byla úspěšně přijata. Děkujeme!
      </Text>

      {/* Order info */}
      <Section style={{ backgroundColor: "#F0FFF0", padding: "16px", borderRadius: "6px", border: "1px solid #D0F0D0", marginBottom: "20px" }}>
        <Text style={{ fontSize: "12px", color: "#666", margin: "0 0 4px" }}>Objednávka</Text>
        <Text style={{ fontSize: "18px", fontWeight: "bold", color: "#0B1727", margin: "0 0 8px", fontFamily: "monospace" }}>
          #{orderNumber}
        </Text>
        <Text style={{ fontSize: "14px", color: "#333", margin: "0 0 4px" }}>
          Částka: <strong>{formatPrice(total)}</strong>
        </Text>
        <Text style={{ fontSize: "13px", color: "#666", margin: 0 }}>
          Zaplaceno: {paidAt}
        </Text>
      </Section>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        Vaši objednávku nyní připravujeme k odeslání. O odeslání Vás budeme informovat dalším emailem.
      </Text>

      {/* CTA */}
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
