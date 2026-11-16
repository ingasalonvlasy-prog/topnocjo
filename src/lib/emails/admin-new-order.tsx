import { Text, Section, Row, Column, Hr, Link } from "@react-email/components";
import { EmailLayout } from "./layout";

interface OrderItem {
  productName: string;
  variantTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface AdminNewOrderProps {
  orderNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  items: OrderItem[];
  subtotal: number;
  discountCode?: string;
  discountAmount?: number;
  shippingPrice: number;
  shippingName: string;
  total: number;
  paymentMethod: string;
  needsSupplier: boolean;
  street: string;
  city: string;
  zip: string;
  pickupPointName?: string;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount / 100)) + "\u00A0Kč";
}

export function AdminNewOrder({
  orderNumber,
  firstName,
  lastName,
  email,
  phone,
  items,
  subtotal,
  discountCode,
  discountAmount,
  shippingPrice,
  shippingName,
  total,
  paymentMethod,
  needsSupplier,
  street,
  city,
  zip,
  pickupPointName,
}: AdminNewOrderProps) {
  return (
    <EmailLayout preview={`Nová objednávka #${orderNumber}`}>
      <Text style={{ fontSize: "18px", fontWeight: "bold", color: "#0B1727", margin: "0 0 16px" }}>
        Nová objednávka
      </Text>

      {/* Order number */}
      <Section style={{ backgroundColor: "#F3F0FF", padding: "16px", borderRadius: "6px", border: "1px solid #DDD8FF", marginBottom: "20px" }}>
        <Text style={{ fontSize: "12px", color: "#666", margin: "0 0 4px" }}>Číslo objednávky</Text>
        <Text style={{ fontSize: "20px", fontWeight: "bold", color: "#0B1727", margin: "0 0 8px", fontFamily: "monospace" }}>
          #{orderNumber}
        </Text>
        <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 2px" }}>
          Zákazník: <strong>{firstName} {lastName}</strong>
        </Text>
        <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 2px" }}>
          Email: {email}
        </Text>
        {phone && (
          <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 2px" }}>
            Telefon: {phone}
          </Text>
        )}
        <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 2px" }}>
          Platba: {paymentMethod === "card" ? "Kartou online" : paymentMethod === "cod" ? "Dobírka" : "Bankovní převod"}
        </Text>
      </Section>

      {needsSupplier && (
        <Section style={{ backgroundColor: "#FFF7ED", padding: "12px 16px", borderRadius: "6px", border: "1px solid #FED7AA", marginBottom: "16px" }}>
          <Text style={{ fontSize: "13px", color: "#C2410C", margin: 0, fontWeight: "bold" }}>
            Pozor: Objednávka vyžaduje dodávku od dodavatele
          </Text>
        </Section>
      )}

      {/* Address */}
      <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 8px" }}>
        Adresa
      </Text>
      <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
        {street}, {zip} {city}
      </Text>
      {pickupPointName && (
        <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
          Výdejní místo: <strong>{pickupPointName}</strong>
        </Text>
      )}

      <Hr style={{ borderColor: "#ddd", margin: "16px 0" }} />

      {/* Items */}
      <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 8px" }}>
        Položky
      </Text>
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
              {formatPrice(item.totalPrice)}
            </Text>
          </Column>
        </Row>
      ))}

      <Hr style={{ borderColor: "#ddd", margin: "16px 0" }} />

      {/* Totals */}
      <Row>
        <Column><Text style={{ fontSize: "13px", color: "#666", margin: "4px 0" }}>Mezisoučet</Text></Column>
        <Column style={{ textAlign: "right" as const }}><Text style={{ fontSize: "13px", color: "#333", margin: "4px 0" }}>{formatPrice(subtotal)}</Text></Column>
      </Row>
      {discountAmount && discountAmount > 0 && (
        <Row>
          <Column>
            <Text style={{ fontSize: "13px", color: "#16a34a", margin: "4px 0" }}>
              Sleva{discountCode ? ` (${discountCode})` : ""}
            </Text>
          </Column>
          <Column style={{ textAlign: "right" as const }}>
            <Text style={{ fontSize: "13px", color: "#16a34a", fontWeight: "bold", margin: "4px 0" }}>
              -{formatPrice(discountAmount)}
            </Text>
          </Column>
        </Row>
      )}
      <Row>
        <Column><Text style={{ fontSize: "13px", color: "#666", margin: "4px 0" }}>Doprava ({shippingName})</Text></Column>
        <Column style={{ textAlign: "right" as const }}><Text style={{ fontSize: "13px", color: "#333", margin: "4px 0" }}>{shippingPrice === 0 ? "Zdarma" : formatPrice(shippingPrice)}</Text></Column>
      </Row>
      <Hr style={{ borderColor: "#ddd", margin: "8px 0" }} />
      <Row>
        <Column><Text style={{ fontSize: "18px", fontWeight: "bold", color: "#0B1727", margin: "4px 0" }}>Celkem</Text></Column>
        <Column style={{ textAlign: "right" as const }}><Text style={{ fontSize: "18px", fontWeight: "bold", color: "#0B1727", margin: "4px 0" }}>{formatPrice(total)}</Text></Column>
      </Row>

      <Hr style={{ borderColor: "#ddd", margin: "20px 0" }} />

      {/* CTA */}
      <Section style={{ textAlign: "center" as const }}>
        <Link
          href={`https://qsport.cz/admin/objednavky`}
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
          Zobrazit v administraci
        </Link>
      </Section>
    </EmailLayout>
  );
}
