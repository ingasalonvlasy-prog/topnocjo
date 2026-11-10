import { Text, Section, Link } from "@react-email/components";
import { EmailLayout } from "./layout";

interface OrderShippedProps {
  orderNumber: string;
  firstName: string;
  shippingName: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export function OrderShipped({ orderNumber, firstName, shippingName, trackingNumber, trackingUrl }: OrderShippedProps) {
  return (
    <EmailLayout preview={`Objednávka ${orderNumber} byla odeslána`}>
      <Text style={{ fontSize: "16px", color: "#333", margin: "0 0 16px" }}>
        Dobrý den, {firstName},
      </Text>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        Vaše objednávka byla odeslána a je na cestě k Vám!
      </Text>

      {/* Order info */}
      <Section style={{ backgroundColor: "#F3F0FF", padding: "16px", borderRadius: "6px", border: "1px solid #DDD8FF", marginBottom: "20px" }}>
        <Text style={{ fontSize: "12px", color: "#666", margin: "0 0 4px" }}>Objednávka</Text>
        <Text style={{ fontSize: "18px", fontWeight: "bold", color: "#0B1727", margin: "0 0 8px", fontFamily: "monospace" }}>
          {orderNumber}
        </Text>
        <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
          Dopravce: <strong>{shippingName}</strong>
        </Text>
        {trackingNumber && (
          <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
            Sledovací číslo: <strong>{trackingNumber}</strong>
          </Text>
        )}
      </Section>

      {/* Tracking CTA */}
      {trackingUrl && (
        <Section style={{ textAlign: "center" as const, marginBottom: "16px" }}>
          <Link
            href={trackingUrl}
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
            Sledovat zásilku
          </Link>
        </Section>
      )}

      {!trackingUrl && (
        <Section style={{ textAlign: "center" as const }}>
          <Link
            href={`https://qsport.cz/objednavka/${orderNumber}`}
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
      )}
    </EmailLayout>
  );
}
