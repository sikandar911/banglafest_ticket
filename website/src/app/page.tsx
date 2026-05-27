import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const profilePoints = [
  "An annual platform that brings Bangladeshi culture, music, recognition, and community energy to UK audiences.",
  "A meeting point for families, young professionals, creatives, entrepreneurs, and community partners.",
  "A profile-led brand with room for live entertainment, business networking, artisan showcases, and meaningful collaborations.",
];

const awardPoints = [
  "Celebrate Bengalis in the UK whose work strengthens links between Britain and Bangladesh.",
  "Highlight entrepreneurship, investment, innovation, leadership, and community impact.",
  "Create a stage that inspires the diaspora and shows the global contribution of Bangladeshi talent.",
];

const traditionItems = [
  "Eco-conscious handcrafted goods with strong cultural identity.",
  "Natural materials including jute, bamboo, hogla and pottery traditions.",
  "Signature craft categories such as nakshi kantha, woven textiles, baskets, and wooden, brass, and clay pieces.",
];

const sponsorTiers = [
  {
    title: "Title Sponsor",
    glowClass: "sponsor-glow-pink",
    summary: "Lead the festival narrative with top-tier visibility across campaign storytelling, stage presence, and destination branding.",
    benefits: ["Naming association", "Priority brand exposure", "Feature placement in promotions"],
  },
  {
    title: "Powered By Sponsor",
    glowClass: "sponsor-glow-gold",
    summary: "Stand beside the core experience with strong placement across event materials, social media, and venue branding.",
    benefits: ["Prominent logo presence", "Integrated campaign support", "On-site activation opportunities"],
  },
  {
    title: "Co-Sponsor",
    glowClass: "sponsor-glow-green",
    summary: "Join the partner circle with visible recognition in event communication, engagement touchpoints, and supporting assets.",
    benefits: ["Brand inclusion on collateral", "Audience engagement support", "Recognition in event content"],
  },
];

const eventTracks = [
  "Live music performances and stage showcases",
  "Award presentations and storytelling moments",
  "Cultural programming rooted in Bangladeshi identity",
  "Business networking and diaspora community engagement",
  "Handcrafted product displays and heritage-focused exhibits",
  "Family-friendly gathering spaces designed for all ages",
];

export default function Home() {
  return (
    <main className="text-white">
      <SiteHeader />

      <section id="top" className="relative isolate overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-25" />
        <div className="absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top_left,_rgba(241,141,167,0.2),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(17,94,89,0.26),_transparent_28%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-18 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div className="relative z-10 flex flex-col justify-center">
            <p className="section-label mb-4 text-sm text-[#f59e0b] uppercase">Annual Cultural Profile</p>
            <h1 className="display-title max-w-4xl text-6xl leading-none text-white sm:text-7xl lg:text-8xl">
              Bangla Fest & Award UK
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/74 sm:text-xl">
              A year-round identity for an annual UK celebration of Bangladeshi culture, performance, recognition, tradition, and community connection.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#profile"
                className="rounded-full border border-white/15 bg-white px-6 py-3 text-sm font-bold text-black hover:-translate-y-0.5 hover:bg-white/90"
              >
                Explore Profile
              </a>
              <a
                href="https://ticket.banglafest.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/15 bg-white/6 px-6 py-3 text-sm font-bold text-white hover:-translate-y-0.5 hover:bg-white/10"
              >
                Open Ticketing Site
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="glass-card rounded-3xl p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Identity</p>
                <p className="mt-3 text-lg font-semibold">Festival, awards, and heritage in one annual destination.</p>
              </div>
              <div className="glass-card rounded-3xl p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Audience</p>
                <p className="mt-3 text-lg font-semibold">Families, diaspora leaders, creatives, youth, and UK partners.</p>
              </div>
              <div className="glass-card rounded-3xl p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Purpose</p>
                <p className="mt-3 text-lg font-semibold">Build pride, recognition, visibility, and cross-community connection.</p>
              </div>
            </div>
          </div>

          <div className="relative min-h-[34rem] lg:min-h-[42rem]">
            <div className="absolute -right-10 top-0 h-48 w-48 rounded-full bg-[#bd2635]/20 blur-3xl" />
            <div className="absolute left-0 top-16 h-60 w-60 rounded-full bg-[#115e59]/25 blur-3xl" />

            <div className="section-shell relative h-full rounded-[2rem] p-5 sm:p-7">
              <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
              <div className="relative flex h-full flex-col justify-between gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="section-label text-xs text-white/55 uppercase">Signature Visual</p>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-white/70">
                      The festival identity brings together motion, heritage, strength, and pride across every audience touchpoint.
                    </p>
                  </div>
                  <Image
                    src="/color spplash.png"
                    alt="Festival colour splash"
                    width={180}
                    height={120}
                    className="hidden h-auto w-32 opacity-85 sm:block"
                  />
                </div>

                <div className="relative mx-auto w-full max-w-md">
                  <div className="absolute inset-6 rounded-full border border-white/10" />
                  <Image
                    src="/banglafest logo.png"
                    alt="Bangla Fest & Award UK brand mark"
                    width={520}
                    height={520}
                    loading="eager"
                    className="relative z-10 h-auto w-full drop-shadow-[0_18px_60px_rgba(0,0,0,0.5)]"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="section-label text-xs text-[#f59e0b] uppercase">Cultural Reach</p>
                    <p className="mt-3 text-sm leading-6 text-white/72">
                      A platform shaped for community pride, intergenerational attendance, and diaspora storytelling.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                    <p className="section-label text-xs text-[#f59e0b] uppercase">Brand Energy</p>
                    <p className="mt-3 text-sm leading-6 text-white/72">
                      Flexible enough for annual campaigns while keeping one recognisable Banglafest identity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-20 sm:px-6 lg:px-8">
        <section id="profile" className="section-shell rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="accent-border pt-7">
            <p className="section-label text-sm text-[#f59e0b] uppercase">Basic Profile</p>
            <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
              <div>
                <h2 className="display-title text-4xl text-white sm:text-5xl">A modern annual profile for Bangla Fest & Award UK.</h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
                  This website positions Bangla Fest & Award UK as a recurring cultural destination, not a one-year event page. It tells the enduring story: recognition, performance, tradition, community, and partnership.
                </p>
              </div>
              <div className="grid gap-4">
                {profilePoints.map((point) => (
                  <article key={point} className="glass-card rounded-3xl p-5">
                    <p className="text-base leading-7 text-white/82">{point}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="accent-border pt-7">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <p className="section-label text-sm text-[#f59e0b] uppercase">Managed & Presented By</p>
                <h2 className="display-title mt-4 text-4xl text-white sm:text-5xl">Ambrosian Events and Management powers the project behind Bangla Fest & Award UK.</h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
                  This project is managed and presented by Ambrosian Events and Management, bringing together cultural production, event strategy, and audience-focused delivery for the main Banglafest brand.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    "Music Concerts and Festival",
                    "Corporate Excellence",
                    "Wedding Ceremony",
                  ].map((service) => (
                    <article key={service} className="glass-card rounded-3xl p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/50">Service</p>
                      <p className="mt-3 text-lg font-semibold leading-7 text-white">{service}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 sm:p-8">
                <div className="logo-stage relative rounded-[1.75rem] p-6 sm:p-8">
                  <Image
                    src="/ambrosian-final-logo-3.png"
                    alt="Ambrosian Events and Management"
                    width={620}
                    height={340}
                    className="relative z-10 mx-auto h-auto w-full max-w-md"
                  />
                </div>
                <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="section-label text-xs text-white/50 uppercase">Presentation Partner</p>
                  <p className="mt-3 text-sm leading-7 text-white/72">
                    Ambrosian supports the brand experience across live entertainment, corporate programmes, and ceremonial event delivery.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="awards" className="section-shell rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="accent-border pt-7">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="section-label text-sm text-[#f59e0b] uppercase">Award Ceremony</p>
                <h2 className="display-title mt-4 text-4xl text-white sm:text-5xl">Recognising achievement that connects the UK and Bangladesh.</h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
                  The award ceremony honours individuals whose work creates impact across business, innovation, leadership, and community life. It gives visibility to stories that strengthen cultural pride and economic connection.
                </p>
                <div className="mt-6 grid gap-4">
                  {awardPoints.map((point) => (
                    <div key={point} className="flex gap-3 rounded-3xl border border-white/10 bg-white/4 p-4">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#f18da7]" />
                      <p className="text-base leading-7 text-white/82">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 sm:p-8">
                <Image
                  src="/logo part map.png"
                  alt="Bangladesh map illustration"
                  width={560}
                  height={560}
                  className="absolute right-0 top-0 h-full w-full object-contain opacity-18"
                />
                <div className="relative z-10">
                  <p className="section-label text-xs text-white/50 uppercase">Why It Matters</p>
                  <blockquote className="mt-4 max-w-md text-2xl leading-10 text-white">
                    The ceremony puts Bangladeshi excellence on a visible UK stage and turns recognition into a community-wide story.
                  </blockquote>
                  <div className="mt-8 rounded-3xl border border-[#f18da7]/30 bg-black/25 p-5">
                    <p className="text-sm leading-7 text-white/72">
                      Built as an annual recognition moment that can evolve every year while keeping the same cultural mission and premium presentation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tradition" className="section-shell rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="accent-border pt-7">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 p-6 sm:p-8">
                <Image
                  src="/logo part tiger.png"
                  alt="Tiger illustration"
                  width={360}
                  height={360}
                  className="mx-auto h-auto w-56 sm:w-72"
                />
                <p className="mt-6 text-center text-sm leading-7 text-white/68">
                  Tradition appears here as something living and exportable: craftsmanship, material culture, design language, and cultural memory.
                </p>
              </div>

              <div>
                <p className="section-label text-sm text-[#f59e0b] uppercase">Bangla Tradition</p>
                <h2 className="display-title mt-4 text-4xl text-white sm:text-5xl">Heritage expressed through handcrafted culture.</h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
                  Bangla Fest & Award UK can spotlight traditional craft and design in a way that resonates with both diaspora audiences and wider UK visitors. The focus is heritage with contemporary relevance.
                </p>

                <div className="mt-6 grid gap-4">
                  {traditionItems.map((item) => (
                    <article key={item} className="glass-card rounded-3xl p-5">
                      <p className="text-base leading-7 text-white/82">{item}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="sponsorship" className="section-shell rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="accent-border pt-7">
            <p className="section-label text-sm text-[#f59e0b] uppercase">Sponsorship</p>
            <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="display-title text-4xl text-white sm:text-5xl">Partnership tiers for UK companies that want cultural visibility.</h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-white/72">
                  Sponsorship is positioned as a partnership with an annual cultural platform. Brands can align with community visibility, stage presence, audience engagement, and long-term brand association without turning this page into a one-off proposal.
                </p>
              </div>
              <a
                href="mailto:connect@ambrosianuk.com?subject=Bangla%20Fest%20Sponsorship%20Enquiry"
                className="rounded-full border border-white/15 bg-white/6 px-6 py-3 text-sm font-bold text-white hover:-translate-y-0.5 hover:bg-white/10"
              >
                Enquire About Sponsorship
              </a>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {sponsorTiers.map((tier, index) => (
                <article key={tier.title} className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/25 p-6">
                  <div className={`absolute right-0 top-0 h-28 w-28 rounded-full blur-3xl ${tier.glowClass}`} />
                  <div className="relative z-10">
                    <p className="section-label text-xs text-white/50 uppercase">Tier {index + 1}</p>
                    <h3 className="mt-4 text-2xl font-extrabold text-white">{tier.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-white/72">{tier.summary}</p>
                    <ul className="mt-6 space-y-3">
                      {tier.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-3 text-sm text-white/82">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="events" className="section-shell rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="accent-border pt-7">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.92fr]">
              <div>
                <p className="section-label text-sm text-[#f59e0b] uppercase">Events</p>
                <h2 className="display-title mt-4 text-4xl text-white sm:text-5xl">Discover the current public event lineup on a dedicated page.</h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
                  The main site now links to a dedicated events route where public event data is loaded from the Banglafest ticketing backend. This landing section still frames the range of experiences visitors can expect each year.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {eventTracks.map((track) => (
                    <div key={track} className="rounded-3xl border border-white/10 bg-white/4 px-4 py-4 text-sm leading-7 text-white/82">
                      {track}
                    </div>
                  ))}
                </div>
                <Link
                  href="/events"
                  className="mt-8 inline-flex rounded-full border border-white/15 bg-white px-6 py-3 text-sm font-bold text-black hover:-translate-y-0.5 hover:bg-white/90"
                >
                  View All Events
                </Link>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(189,38,53,0.22),rgba(17,94,89,0.18))] p-6 sm:p-8">
                <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-black/20 p-6">
                  <p className="section-label text-xs text-white/50 uppercase">Events Route</p>
                  <p className="mt-4 text-2xl leading-9 text-white">Browse the public schedule at the dedicated /events page and continue to the ticketing platform from each listing.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
