import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingActions from "@/components/FloatingActions";
import { getContent } from "@/lib/cms/content-store";
import { siteUrl } from "@/lib/seo";
import "../globals.css";
import "../reference-theme.css";
import "../editorial.css";
export const revalidate = 3600;
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organization } = await getContent();
  const schema = {
    "@context": "https://schema.org",
    "@type": "NGO",
    "@id": `${siteUrl}/#organization`,
    name: organization.name,
    alternateName: organization.shortName,
    url: siteUrl,
    logo: `${siteUrl}/images/logo.webp`,
    foundingDate: "2023-05-03",
    email: organization.email,
    telephone: organization.phone,
    areaServed: { "@type": "Country", name: "Türkiye" },
    sameAs: [organization.instagram],
    description: organization.footerText,
  };
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: organization.name,
    alternateName: organization.shortName,
    inLanguage: "tr-TR",
    publisher: { "@id": `${siteUrl}/#organization` },
  };
  return (
    <>
      <a className="skip-link" href="#main">
        İçeriğe geç
      </a>
      <div className="site-shell">
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </div>
      <FloatingActions />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
