import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface LayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#F3F3F0", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
          {/* Header */}
          <Section style={{ backgroundColor: "#0B1727", padding: "24px", borderRadius: "8px 8px 0 0", textAlign: "center" as const }}>
            <Text style={{ color: "#CEFF2F", fontSize: "24px", fontWeight: "bold", margin: 0, letterSpacing: "1px" }}>
              Qsport.cz
            </Text>
          </Section>

          {/* Content */}
          <Section style={{ backgroundColor: "#FFFFFF", padding: "32px 28px", borderRadius: "0 0 8px 8px" }}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ padding: "20px", textAlign: "center" as const }}>
            <Text style={{ color: "#666", fontSize: "12px", margin: "0 0 4px" }}>
              Qsport.cz — Sportovní vybavení
            </Text>
            <Text style={{ color: "#999", fontSize: "11px", margin: 0 }}>
              Tento email byl odeslán automaticky, neodpovídejte na něj.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
