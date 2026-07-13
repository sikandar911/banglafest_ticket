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
    <footer className="border-t border-white/10 bg-black/55 text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <Image
              src="/banglafest-flat-logo.png"
              alt="Bangla Fest & Award UK"
              width={220}
              height={56}
              className="h-11 w-auto"
            />
            <div className="space-y-1 text-xs text-white/50">
              <p>Email: connect@ambrosianuk.com</p>
              <p>Phone: +44 7424 407743</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-xs font-semibold tracking-[0.16em] text-white/58 uppercase">
            {siteNavItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white transition-colors">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 flex flex-col md:flex-row md:items-start justify-between gap-6 text-xs text-white/40">
          <div className="max-w-2xl text-left">
            <p className="font-semibold text-white/70 mb-1">
              Developed by{" "}
              <a 
                href="https://fireworksco.uk/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#f18da7] hover:underline font-bold transition-all"
              >
                Fireworks CO UK
              </a>
              {" "}— Modern Growth Engineering for UK & Australian Enterprise Brands.
            </p>
            <p className="leading-relaxed">
              Based in London, Fireworks CO UK develops dynamic web and mobile applications, deploys high-converting digital marketing, and builds advanced automation workflows. We increase your business visibility, scale your revenue, and automate your operations.
            </p>
          </div>
          <p className="shrink-0 md:text-right self-end md:self-auto">
            © {new Date().getFullYear()} Banglafest. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export { siteNavItems };