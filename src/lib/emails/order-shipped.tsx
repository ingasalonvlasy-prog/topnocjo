import { Text, Section, Link } from "@react-email/components";
import { EmailLayout } from "./layout";

interface OrderShippedProps {
  orderNumber: string;
  firstName: string;
  shippingName: string;
  trackingNumber?: string;
  trackingUrl?: string;
  viewToken?: string;
  items?: Array<{ name: string; quantity: number }>;
  pickupPointName?: string;
  deliveryAddress?: string;
}

export function OrderShipped({
  orderNumber,
  firstName,
  shippingName,
  trackingNumber,
  trackingUrl,
  viewToken,
  items,
  pickupPointName,
  deliveryAddress,
}: OrderShippedProps) {
  return (
    <EmailLayout preview={`Objednávka #${orderNumber} byla odeslána`}>
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
          #{orderNumber}
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

      {/* Tracking CTA — prominent */}
      {trackingUrl && (
        <Section style={{ textAlign: "center" as const, marginBottom: "20px" }}>
          <Link
            href={trackingUrl}
            style={{
              display: "inline-block",
              backgroundColor: "#0B1727",
              color: "#CEFF2F",
              padding: "14px 32px",
              borderRadius: "6px",
              fontSize: "15px",
              fontWeight: "bold",
              textDecoration: "none",
            }}
          >
            Sledovat zásilku
          </Link>
        </Section>
      )}

      {/* What's on the way */}
      {items && items.length > 0 && (
        <>
          <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "16px 0 8px" }}>
            Co je na cestě
          </Text>
          {items.map((item, i) => (
            <Text key={i} style={{ fontSize: "13px", color: "#555", margin: "2px 0" }}>
              {item.quantity}&times; {item.name}
            </Text>
          ))}
        </>
      )}

      {/* Where it's going */}
      {(pickupPointName || deliveryAddress) && (
        <>
          <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "16px 0 8px" }}>
            Doručení
          </Text>
          <Text style={{ fontSize: "13px", color: "#555", margin: "0" }}>
            {pickupPointName ? `${shippingName} — ${pickupPointName}` : deliveryAddress}
          </Text>
        </>
      )}

      {!trackingUrl && (
        <Section style={{ textAlign: "center" as const, marginTop: "20px" }}>
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
      )}
    </EmailLayout>
  );
}
