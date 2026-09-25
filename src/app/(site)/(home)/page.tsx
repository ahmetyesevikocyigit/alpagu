import Instagram from "@/components/InstagramIcon";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { Stats, ProjectCards, JoinBanner } from "@/components/Shared";
import { getContent } from "@/lib/cms/content-store";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata() {
  const c = await getContent();
  return pageMetadata(
    c.home.seo.title,
    c.home.seo.description,
    "/",
    c.home.seo.image,
    c.organization.shortName,
  );
}
export default async function Home() {
  const { home, organization, faqs, news: allNews } = await getContent();
  const news = allNews.filter((n) => n.published).slice(0, 3);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
  return (
    <>
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="home-hero-visual">
          <Image
            className="home-hero-image"
            src={home.image}
            alt={home.alt}
            fill
            sizes="(max-width: 700px) 100vw, 70vw"
            loading="eager"
            fetchPriority="high"
            quality={65}
          />
        </div>
        <div className="home-hero-shade" aria-hidden="true" />
        <div className="home-hero-content container">
          <h1 id="hero-title">{home.title}</h1>
          <p className="home-hero-subtitle">{home.subtitle}</p>
          <div className="hero-actions">
            <a className="hero-action-primary" href={home.primaryHref}>
              {home.primaryLabel} <ArrowUpRight size={21} aria-hidden="true" />
            </a>
            <Link className="hero-action-secondary" href={home.secondaryHref}>
              {home.secondaryLabel} <ArrowRight size={19} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <section className="home-about" id="hikayemiz">
        <div className="home-about-grid">
          <div className="home-about-copy">
            <h2 style={{ whiteSpace: "pre-line" }}>{home.aboutTitle}</h2>
            <p className="home-about-intro">
              {home.aboutIntro} <strong>{home.aboutSince}</strong>
            </p>
            {home.aboutParagraphs.map((text, i) => (
              <p key={i}>{text}</p>
            ))}
            <Link className="text-link" href="/hakkimizda">
              Derneğimizi tanıyın <ArrowRight size={17} />
            </Link>
          </div>
          <div className="home-about-photo">
            <Image
              src={home.aboutImage}
              alt={home.aboutAlt}
              fill
              sizes="(max-width: 700px) 90vw, 40vw"
            />
          </div>
        </div>
        <Stats />
      </section>
      <section className="work-section">
        <div className="container">
          <div className="work-heading" id="calismalarimiz">
            <h2>{home.workTitle}</h2>
          </div>
          <ProjectCards />
        </div>
      </section>
      <JoinBanner />
      <section className="news-section container">
        <div className="news-heading">
          <h2>{home.newsTitle}</h2>
        </div>
        <div className="news-gallery">
          {news.map((news) => (
            <article className="news-card" key={news.id}>
              <a href={news.href} target="_blank" rel="noopener noreferrer">
                <div className="news-image">
                  <Image
                    src={news.image}
                    alt={news.alt}
                    fill
                    sizes="(max-width: 700px) 90vw, 30vw"
                  />
                </div>
                <div className="news-copy">
                  <h3>{news.title}</h3>
                  <p>{news.text}</p>
                  <span className="news-arrow" aria-hidden="true">
                    <ArrowUpRight size={23} />
                  </span>
                </div>
              </a>
            </article>
          ))}
        </div>
        <div className="news-follow">
          <a
            className="text-link"
            href={organization.instagram}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram size={19} /> Instagram’da takip edin{" "}
            <ArrowUpRight size={17} />
          </a>
        </div>
      </section>
      <section className="questions-section">
        <div className="container questions-grid">
          <div className="questions-intro">
            <h2>{home.faqTitle}</h2>
          </div>
          <div className="questions-list">
            {faqs.map((faq) => (
              <details key={faq.id} name="alpagu-faq">
                <summary>
                  {faq.q}
                  <span aria-hidden="true">
                    <Plus size={16} strokeWidth={1.8} />
                  </span>
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
          <div className="questions-contact">
            <Link href="/iletisim" className="text-link">
              Bize ulaşın <ArrowUpRight size={19} />
            </Link>
          </div>
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
