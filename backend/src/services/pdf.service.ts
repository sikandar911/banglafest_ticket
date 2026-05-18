import PDFDocument from 'pdfkit';
import path from 'path';

export interface Performer {
  name: string;
  ticketDisplayName: string;
}

export interface SpecialAddition {
  name: string;
  description: string;
  ticketDisplayText: string;
}

export interface TicketPdfData {
  ticketId: string;
  userName: string;
  userEmail: string;
  eventTitle: string;
  tierName: string;
  eventDate: Date;
  location: string;
  orderId: string;
  createdAt: Date;
  features?: string[];
  performers?: Performer[];
  specialAdditions?: SpecialAddition[];
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function fmtDate(d: Date): string {
  const day = d.getDate();
  const month = d.toLocaleDateString('en-GB', { month: 'long' });
  return `${day}${ordinalSuffix(day)} ${month} ${d.getFullYear()}`;
}

// Resolved once at module load so ts-node-dev and compiled output both work
const LOGO_PATH = path.join(__dirname, '../assets/logo.png');

export async function generateTicketPdf(data: TicketPdfData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // ── QR code fetch with retry ─────────────────────────────────────────
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.ticketId)}&ecc=H&margin=4`;
      let qrBuffer: Buffer | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const r = await fetch(qrUrl, { signal: AbortSignal.timeout(5000) });
          if (!r.ok) throw new Error(`QR API ${r.status}`);
          qrBuffer = Buffer.from(await r.arrayBuffer());
          break;
        } catch (err) {
          if (attempt === 3) throw new Error(`QR fetch failed after 3 attempts: ${err}`);
          await new Promise((res) => setTimeout(res, 1000 * attempt));
        }
      }

      // ── Document — 210 mm × 90 mm (595 pt × 255 pt) ─────────────────────
      const W = 595;
      const H = 255;
      const doc = new PDFDocument({ size: [W, H], margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Palette ──────────────────────────────────────────────────────────
      const WHITE = '#ffffff';
      const NAVY  = '#0d1b3e';
      const GREEN = '#006A4E';
      const RED   = '#CE1126';
      const GRAY  = '#6b6b6b';
      const LGRAY = '#cccccc';
      const BLACK = '#000000';

      // ── Page base ────────────────────────────────────────────────────────
      doc.rect(0, 0, W, H).fill(WHITE);
      doc.roundedRect(1, 1, W - 2, H - 2, 6)
        .strokeColor(LGRAY).lineWidth(1).stroke();

      // ════════════════ LEFT — Logo (x: 2–198) ═════════════════════════════
      // Image is 677 × 667 RGBA (nearly square) — fit within left section.
      // The PNG has transparent background so it composites cleanly on white.
      const LW = 196;  // logo section width
      doc.rect(2, 2, LW - 1, H - 4).fill(WHITE);
      doc.image(LOGO_PATH, 2, 2, {
        fit:    [LW - 4, H - 4],
        align:  'center',
        valign: 'center',
      });

      // Right-edge separator between logo and info sections
      doc.moveTo(LW, 14).lineTo(LW, H - 14)
        .strokeColor(LGRAY).lineWidth(0.75).stroke();

      // ════════════════ MIDDLE — Event details (x: 204–412) ════════════════
      const MX = LW + 8;   // 204
      const MW = 207;

      // "TICKET ADMISSION" header
      doc.fontSize(12.5).font('Helvetica-Bold').fillColor(NAVY)
        .text('TICKET ADMISSION', MX, 12, { width: MW });

      // Rule under header
      doc.moveTo(MX, 29).lineTo(MX + MW, 29)
        .strokeColor(LGRAY).lineWidth(0.6).stroke();

      // ── Detail rows ───────────────────────────────────────────────────────
      const COL = 46;   // label column width
      let ry = 35;

      const row = (label: string, value: string) => {
        doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
          .text(label, MX, ry, { width: COL, lineBreak: false });
        const vh = doc.heightOfString(value, { width: MW - COL, fontSize: 7.5 });
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(NAVY)
          .text(value, MX + COL, ry, { width: MW - COL });
        ry += Math.max(13, vh) + 2;
      };

      row('DATE:',   fmtDate(data.eventDate));
      row('VENUE:',  data.location || 'To Be Announced');
      row('HOLDER:', data.userName);
      row('TIER:',   data.tierName);

      // Performers
      const performers = data.performers && data.performers.length > 0 ? data.performers : null;
      if (performers && ry < H - 40) {
        doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
          .text('PERFORMERS:', MX, ry, { width: MW });
        ry += 11;
        for (const p of performers.slice(0, 5)) {
          if (ry >= H - 30) break;
          doc.circle(MX + 4, ry + 3, 1.4).fill(NAVY).fillOpacity(1);
          doc.fontSize(7.5).font('Helvetica').fillColor(NAVY)
            .text(p.ticketDisplayName, MX + 10, ry, { width: MW - 10 });
          ry += 12;
        }
      }

      // Special additions
      const specials = data.specialAdditions && data.specialAdditions.length > 0 ? data.specialAdditions : null;
      if (specials && ry < H - 40) {
        ry += 2;
        doc.fontSize(7.5).font('Helvetica').fillColor(GRAY)
          .text('SPECIAL:', MX, ry, { width: MW });
        ry += 11;
        for (const s of specials.slice(0, 3)) {
          if (ry >= H - 30) break;
          doc.circle(MX + 4, ry + 3, 1.4).fill(RED).fillOpacity(1);
          doc.fontSize(7.5).font('Helvetica').fillColor(NAVY)
            .text(s.ticketDisplayText, MX + 10, ry, { width: MW - 10 });
          ry += 12;
        }
      }

      // T&C footer
      doc.fontSize(5.8).font('Helvetica').fillColor(GRAY)
        .text('For Terms and Conditions, visit: banglafest.uk/terms', MX, H - 14, { width: MW });

      // ════════════════ PERFORATED TEAR LINE (x ≈ 416) ═════════════════════
      const PX = MX + MW + 5;  // ≈ 416

      doc.circle(PX, 0, 8).fill(WHITE);
      doc.circle(PX, H, 8).fill(WHITE);
      doc.moveTo(PX, 6).lineTo(PX, H - 6)
        .dash(4, { space: 3.5 }).strokeColor('#aaa').lineWidth(0.9).stroke().undash();

      // ════════════════ RIGHT — Stub (x: 422–592) ══════════════════════════
      const SX    = PX + 6;        // ≈ 422
      const BAR_X = W - 26;        // 569  — barcode strip start
      const SIW   = BAR_X - SX - 3; // stub inner width ≈ 140

      // ── QR code ──────────────────────────────────────────────────────────
      const QRS = 102;
      const QRX = SX + Math.floor((SIW - QRS) / 2);
      const QRY = 10;

      doc.roundedRect(QRX - 2, QRY - 2, QRS + 4, QRS + 4, 3)
        .fill(WHITE).strokeColor(LGRAY).lineWidth(0.5).stroke();
      doc.image(qrBuffer!, QRX, QRY, { width: QRS, height: QRS });

      // ── Unique ticket ID ──────────────────────────────────────────────────
      const yr    = data.eventDate.getFullYear();
      const fmtId = `BF${yr}-${data.ticketId.slice(0, 8).toUpperCase()}`;

      doc.fontSize(5.2).font('Helvetica').fillColor(GRAY)
        .text('UNIQUE TICKET ID:', SX, QRY + QRS + 8, { width: SIW, align: 'center' });
      doc.fontSize(7).font('Helvetica-Bold').fillColor(NAVY)
        .text(fmtId, SX, QRY + QRS + 17, { width: SIW, align: 'center' });

      // ── Stub horizontal divider ───────────────────────────────────────────
      const DIVY = H - 50;
      doc.moveTo(SX, DIVY).lineTo(BAR_X - 1, DIVY)
        .dash(2.5, { space: 2.5 }).strokeColor(LGRAY).lineWidth(0.6).stroke().undash();

      // ── Stub bottom branding ──────────────────────────────────────────────
      doc.fontSize(5.8).font('Helvetica').fillColor(GRAY)
        .text('STUB — For Entry Staff', SX, DIVY + 6, { width: SIW, align: 'center' });
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(RED)
        .text('BANGLA FEST', SX, DIVY + 18, { width: SIW, align: 'center' });
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(GREEN)
        .text('& AWARD UK', SX, DIVY + 30, { width: SIW, align: 'center' });

      // ── Barcode strips (deterministic pattern from ticket ID) ─────────────
      const hex = data.ticketId.replace(/-/g, '');
      const bars: number[] = [];
      for (let i = 0; i < hex.length && bars.length < 32; i++) {
        bars.push((parseInt(hex[i], 16) % 3) + 1); // 1–3 pt wide
      }

      let bx    = BAR_X;
      let black = true;
      const BH  = DIVY - 8;
      for (const bw of bars) {
        if (bx + bw > W - 18) break;
        if (black) doc.rect(bx, 8, bw, BH).fill(BLACK).fillOpacity(1);
        bx += bw + 1;
        black = !black;
      }

      // ── "TKT-XXXX" rotated on far right edge ─────────────────────────────
      const tktLabel = `TKT-${data.orderId.slice(0, 4).toUpperCase()}`;
      const rx  = W - 9;
      const ry2 = (BH / 2) + 8;
      doc.save()
        .fontSize(6).font('Helvetica-Bold').fillColor(NAVY)
        .rotate(90, { origin: [rx, ry2] })
        .text(tktLabel, rx - 18, ry2 - 3, { width: 36, align: 'center', lineBreak: false });
      doc.restore();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
