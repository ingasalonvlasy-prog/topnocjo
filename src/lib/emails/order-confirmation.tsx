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
  discountCode?: string;
  discountAmount?: number;
  shippingPrice: number;
  shippingName: string;
  total: number;
  paymentMethod: string;
  street: string;
  city: string;
  zip: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingZip?: string;
  shippingRecipient?: string;
  pickupPointName?: string;
  phone?: string;
  createdAt?: string;
  viewToken?: string;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount / 100)) + "\u00A0Kč";
}

export function OrderConfirmation({
  orderNumber,
  firstName,
  items,
  subtotal,
  discountCode,
  discountAmount,
  shippingPrice,
  shippingName,
  total,
  paymentMethod,
  street,
  city,
  zip,
  shippingStreet,
  shippingCity,
  shippingZip,
  shippingRecipient,
  pickupPointName,
  phone,
  createdAt,
  viewToken,
}: OrderConfirmationProps) {
  const vat = Math.round(total * 0.1736);

  return (
    <EmailLayout preview={`Objednávka #${orderNumber} byla přijata`}>
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
          #{orderNumber}
        </Text>
        {createdAt && (
          <Text style={{ fontSize: "12px", color: "#666", margin: "4px 0 0" }}>
            {createdAt}
          </Text>
        )}
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
      <Row>
        <Column><Text style={{ fontSize: "12px", color: "#999", margin: "2px 0" }}>vč. DPH 21%</Text></Column>
        <Column style={{ textAlign: "right" as const }}><Text style={{ fontSize: "12px", color: "#999", margin: "2px 0" }}>{formatPrice(vat)}</Text></Column>
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
          : paymentMethod === "cod"
            ? "Platba dobírkou — zaplatíte při převzetí zásilky."
            : "Platba bankovním převodem — po připsání platby objednávku potvrdíme."}
      </Text>

      {/* Shipping — billing address */}
      <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "0 0 8px" }}>
        {shippingStreet || pickupPointName ? "Fakturační adresa" : "Doručení"}
      </Text>
      <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
        {!shippingStreet && !pickupPointName && shippingName}
        {!shippingStreet && pickupPointName && `${shippingName} — ${pickupPointName}`}
      </Text>
      <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
        {street}, {zip} {city}
      </Text>
      {phone && (
        <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
          Tel: {phone}
        </Text>
      )}

      {/* Shipping — delivery address (if different) */}
      {(shippingStreet || pickupPointName) && (
        <>
          <Text style={{ fontSize: "14px", fontWeight: "bold", color: "#333", margin: "16px 0 8px" }}>
            Doručovací adresa
          </Text>
          {shippingRecipient && (
            <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>{shippingRecipient}</Text>
          )}
          {pickupPointName ? (
            <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}>
              {shippingName} — {pickupPointName}
            </Text>
          ) : (
            <Text style={{ fontSize: "13px", color: "#555", margin: "0 0 20px" }}>
              {shippingStreet}, {shippingZip} {shippingCity}
            </Text>
          )}
        </>
      )}

      {/* CTA */}
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
    </EmailLayout>
  );
}
