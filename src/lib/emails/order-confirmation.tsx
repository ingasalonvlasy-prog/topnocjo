import { Text, Section, Row, Column, Link, Hr } from "@react-email/components";
import { EmailLayout } from "./layout";

interface OrderItem {
  productName: string;
  variantTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderConfirmationProps {
  orderNumber: string;
  firstName: string;
  items: OrderItem[];
  subtotal: number;
  shippingPrice: number;
  shippingName: string;
  total: number;
  paymentMethod: string;
  street: string;
  city: string;
  zip: string;
  packetaPointName?: string;
  viewToken?: string;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + "\u00A0Kč";
}

export function OrderConfirmation({
  orderNumber,
  firstName,
  items,
  subtotal,
  shippingPrice,
  shippingName,
  total,
  paymentMethod,
  street,
  city,
  zip,
  packetaPointName,
  viewToken,
}: OrderConfirmationProps) {
  return (
    <EmailLayout preview={`Objednávka ${orderNumber} byla přijata`}>
      <Text style={{ fontSize: "16px", color: "#333", margin: "0 0 16px" }}>
        Dobrý den, {firstName},
      </Text>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        děkujeme za Vaši objednávku. Níže najdete její shrnutí.
      </Text>

      {/* Order number */}
      <Section style={{ backgroundColor: "#F3F3F0", padding: "16px", borderRadius: "6px", marginBottom: "20px", textAlign: "center" as const }}>
        <Text style={{ fontSize: "12px", color: "#888", margin: "0 0 4px", textTransform: "uppercase" as const, letterSpacing: "1px" }}>
          Číslo objednávky
        </Text>
        <Text style={{ fontSize: "20px", fontWeight: "bold", color: "#0B1727", margin: 0, fontFamily: "monospace" }}>
          {orderNumber}
        </Text>
      </Section>

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
      <Row>
        <Column><Text style={{ fontSize: "13px", color: "#666", margin: "4px 0" }}>Doprava ({shippingName})</Text></Column>
        <Column style={{ textAlign: "right" as const }}><Text style={{ fontSize: "13px", color: "#333", margin: "4px 0" }}>{shippingPrice === 0 ? "Zdarma" : formatPrice(shippingPrice)}</Text></Column>
      </Row>
      <Hr style={{ borderColor: "#ddd", margin: "8px 0" }} />
      <Row>
        <Column><Text style={{ fontSize: "16px", fontWeight: "bold", color: "#0B1727", margin: "4px 0" }}>Celkem</Text></Column>
        <Column style={{ textAlign: "right" as const }}><Text style={{ fontSize: "16px", fontWeight: "bold", color: "#0B1727", margin: "4px 0" }}>{formatPrice(total)}</Text></Column>
      </Row>

      <Hr style={{ borderColor: "#ddd", margin: "20px 0" }} />

      {/* Payment info */}
      <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 8px" }}>
        Platba
      </Text>
      <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 16px" }}>
        {paymentMethod === "card"
          ? "Platba kartou online — zpracováváme Vaši platbu."
          : "Platba bankovním převodem — po připsání platby objednávku potvrdíme."}
      </Text>

      {/* Shipping */}
      <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 8px" }}>
        Doručení
      </Text>
      <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
        {shippingName}
        {packetaPointName ? ` — ${packetaPointName}` : ""}
      </Text>
      <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 20px" }}>
        {street}, {zip} {city}
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
