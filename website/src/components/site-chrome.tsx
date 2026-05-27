import Image from "next/image";
import Link from "next/link";

const siteNavItems = [
  { href: "/#profile", label: "Profile" },
  { href: "/#awards", label: "Award Ceremony" },
  { href: "/#tradition", label: "Tradition" },
  { href: "/#sponsorship", label: "Sponsorship" },
  { href: "/events", label: "Events" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <Link href="/" className="shrink-0" title="Bangla Fest & Award UK home">
            <Image
              src="/banglafest-flat-logo.png"
              alt="Bangla Fest & Award UK"
              width={220}
              height={56}
              priority
              className="h-9 w-auto sm:h-11"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/events"
              className="inline-flex rounded-full border border-white/15 bg-white/6 px-3 py-2 text-xs font-bold text-white hover:-translate-y-0.5 hover:bg-white/10 sm:hidden"
            >
              Events
            </Link>
            <a
              href="https://ticket.banglafest.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[#f18da7]/40 bg-[#bd2635] px-3 py-2 text-xs font-bold text-white shadow-[0_0_30px_rgba(189,38,53,0.28)] hover:-translate-y-0.5 hover:bg-[#a61d2b] sm:px-5 sm:text-sm"
            >
              Get Tickets
            </a>
          </div>
        </div>

        <nav className="mt-4 hidden flex-wrap items-center gap-x-5 gap-y-3 sm:flex">
          {siteNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold tracking-[0.18em] text-white/68 uppercase hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/55">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-4">
          <Image
            src="/banglafest-flat-logo.png"
            alt="Bangla Fest & Award UK"
            width={220}
            height={56}
            className="h-11 w-auto"
          />
          <div className="space-y-1 text-sm text-white/72">
            <p>Email: connect@ambrosianuk.com</p>
            <p>Phone: +44 7424 407743</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-sm font-semibold tracking-[0.16em] text-white/58 uppercase">
          {siteNavItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

export { siteNavItems };