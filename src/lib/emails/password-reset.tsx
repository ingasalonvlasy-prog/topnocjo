import { Text, Section, Link } from "@react-email/components";
import { EmailLayout } from "./layout";

interface PasswordResetProps {
  firstName?: string;
  resetUrl: string;
}

export function PasswordReset({ firstName, resetUrl }: PasswordResetProps) {
  return (
    <EmailLayout preview="Obnova hesla na Qsport.cz">
      <Text style={{ fontSize: "16px", color: "#333", margin: "0 0 16px" }}>
        {firstName ? `Dobrý den, ${firstName},` : "Dobrý den,"}
      </Text>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        obdrželi jsme žádost o obnovu hesla k Vašemu účtu na Qsport.cz.
        Klikněte na tlačítko níže pro nastavení nového hesla.
      </Text>

      <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Link
          href={resetUrl}
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
          Nastavit nové heslo
        </Link>
      </Section>

      <Text style={{ fontSize: "12px", color: "#888", margin: "20px 0 0" }}>
        Odkaz je platný 1 hodinu. Pokud jste o obnovu hesla nežádali,
        tento email ignorujte — Váš účet zůstane beze změny.
      </Text>
    </EmailLayout>
  );
}
