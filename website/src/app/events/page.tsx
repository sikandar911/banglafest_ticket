import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

type TicketTier = {
  id: string;
  name: string;
  availabilityStatus: string;
};

type Performer = {
  name: string;
  ticketDisplayName?: string;
};

type SpecialAddition = {
  name: string;
  ticketDisplayText?: string;
};

type EventItem = {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  imageUrl: string | null;
  performers: Performer[];
  specialAdditions: SpecialAddition[];
  ticketTiers: TicketTier[];
};

type EventsResponse = {
  events: EventItem[];
};

export const metadata: Metadata = {
  title: "Events | Bangla Fest & Award UK",
  description: "Current public events for Bangla Fest & Award UK, loaded from the ticketing backend.",
};

async function getEvents(): Promise<EventItem[]> {
  const response = await fetch("https://api.banglafest.co.uk/api/events", {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch events");
  }

  const data = (await response.json()) as EventsResponse;
  return data.events ?? [];
}

function formatDateRange(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dateFormatter.format(start)} • ${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <main className="text-white">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {events.length === 0 ? (
          <div className="section-shell rounded-[2rem] px-6 py-10 sm:px-8">
            <div className="accent-border pt-7">
              <h2 className="display-title text-4xl text-white">No public events are available right now.</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/72">
                Check back later or open the ticketing platform directly for the latest availability.
              </p>
              <a
                href="https://ticket.banglafest.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex rounded-full border border-[#f18da7]/40 bg-[#bd2635] px-6 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(189,38,53,0.28)] hover:-translate-y-0.5 hover:bg-[#a61d2b]"
              >
                Open Ticketing Site
              </a>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {events.map((event) => (
              <article key={event.id} className="section-shell overflow-hidden rounded-[2rem]">
                <div>
                  <div className="relative aspect-[1286/486] min-h-[14rem] bg-black/20">
                    {event.imageUrl ? (
                      <>
                        <Image
                          src={event.imageUrl}
                          alt={event.title}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(189,38,53,0.28),rgba(17,94,89,0.2))]" />
                    )}
                  </div>

                  <div className="px-6 py-5 sm:px-8 sm:py-6">
                    <p className="section-label text-xs text-[#f59e0b] uppercase">Live Listing</p>
                    <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl lg:text-4xl">{event.title}</h2>
                    <p className="mt-1 text-sm text-white/72 sm:text-base">{formatDateRange(event.startTime, event.endTime)}</p>
                  </div>

                  <div className="border-t border-white/8 px-6 py-7 sm:px-8 sm:py-8">
                    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
                      <div>
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/48">Location</p>
                          <p className="mt-2 text-lg text-white">{event.location}</p>
                        </div>

                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/48">Ticket Tiers</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {event.ticketTiers.map((tier) => (
                              <span key={tier.id} className="rounded-full border border-[#f18da7]/20 bg-[#bd2635]/12 px-3 py-2 text-sm text-white/88">
                                {tier.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {event.description ? (
                          <p className="mt-6 text-base leading-8 text-white/76">{event.description}</p>
                        ) : (
                          <p className="mt-6 text-base leading-8 text-white/62">
                            Follow the live listing for performance details, venue information, and current ticket availability.
                          </p>
                        )}

                        <div className="mt-6 flex flex-wrap gap-4">
                          <a
                            href={`https://ticket.banglafest.co.uk/events/${event.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-[#f18da7]/40 bg-[#bd2635] px-6 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(189,38,53,0.28)] hover:-translate-y-0.5 hover:bg-[#a61d2b]"
                          >
                            Get Tickets Now
                          </a>
                          <Link
                            href="/"
                            className="rounded-full border border-white/15 bg-white/6 px-6 py-3 text-sm font-bold text-white hover:-translate-y-0.5 hover:bg-white/10"
                          >
                            Back To Main Site
                          </Link>
                        </div>
                      </div>

                      <div className="grid gap-6">
                        {event.performers.length > 0 ? (
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/48">Performers</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {event.performers.map((performer) => (
                                <span key={performer.name} className="rounded-full border border-white/10 bg-white/4 px-3 py-2 text-sm text-white/84">
                                  {performer.ticketDisplayName ?? performer.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {event.specialAdditions.length > 0 ? (
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/48">Special Additions</p>
                            <div className="mt-3 grid gap-3">
                              {event.specialAdditions.map((item) => (
                                <div key={item.name} className="rounded-3xl border border-white/10 bg-white/4 px-4 py-4 text-sm leading-7 text-white/82">
                                  {item.ticketDisplayText ?? item.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {event.ticketTiers.length === 0 ? (
                          <div className="rounded-3xl border border-white/10 bg-white/4 px-4 py-4 text-sm leading-7 text-white/70">
                            Ticket tiers will appear here when they are published.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}