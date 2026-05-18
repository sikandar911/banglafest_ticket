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

function fmtIssued(d: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Resolved once at module load so ts-node-dev and compiled output both work
const LOGO_PATH = path.join(__dirname, '../assets/logo.png');

export async function generateTicketPdf(data: TicketPdfData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // ── QR code fetch with retry ─────────────────────────────────────────
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(data.ticketId)}&ecc=H&margin=2`;
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

      const WHITE = '#ffffff';
      const BLACK = '#000000';
      const GRAY  = '#666666';
      const LGRAY = '#cccccc';

      // White background
      doc.rect(0, 0, W, H).fill(WHITE);

      // ── Outer dashed rounded border ──────────────────────────────────────
      doc.roundedRect(2, 2, W - 4, H - 4, 8)
        .dash(5, { space: 3 })
        .strokeColor('#444444')
        .lineWidth(1.3)
        .stroke()
        .undash();

      // ════════════════ LEFT — Logo (x 0–222) ══════════════════════════════
      const LW = 222;
      doc.image(LOGO_PATH, 0, 0, {
        fit:    [LW, H],
        align:  'center',
        valign: 'center',
      });

      // ════════════════ VERTICAL DIVIDER (x ≈ 416) ═════════════════════════
      const DIV_X = 416;
      doc.moveTo(DIV_X, 16).lineTo(DIV_X, H - 16)
        .strokeColor(LGRAY)
        .lineWidth(0.8)
        .stroke();

      // ════════════════ MIDDLE — Event details (x 230–413) ═════════════════
      const MX    = 230;
      const MW    = DIV_X - MX - 3;  // ≈ 183
      const LBL_W = 52;              // label column width
      let   ry    = 14;

      // "TICKET ADMISSION" — large bold header
      doc.fontSize(19).font('Helvetica-Bold').fillColor(BLACK)
        .text('TICKET ADMISSION', MX, ry, { width: MW });
      ry += 30;

      // DATE row
      doc.fontSize(9.5).font('Helvetica').fillColor(BLACK)
        .text('DATE:', MX, ry, { width: LBL_W, lineBreak: false });
      doc.fontSize(9.5).font('Helvetica').fillColor(BLACK)
        .text(fmtDate(data.eventDate), MX + LBL_W, ry, { width: MW - LBL_W });
      ry += 16;

      // VENUE row — venue name in bold, address continuation in regular
      doc.fontSize(9.5).font('Helvetica').fillColor(BLACK)
        .text('VENUE:', MX, ry, { width: LBL_W, lineBreak: false });

      const venue     = data.location || 'To Be Announced';
      const commaIdx  = venue.indexOf(',');
      const venueName = commaIdx > -1 ? venue.slice(0, commaIdx) : venue;
      const venueAddr = commaIdx > -1 ? venue.slice(commaIdx) : '';
      const valX      = MX + LBL_W;
      const valW      = MW - LBL_W;

      // Bold first segment (venue name) then regular for address
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BLACK)
        .text(venueName, valX, ry, { width: valW, continued: venueAddr.length > 0, lineBreak: venueAddr.length === 0 });
      if (venueAddr) {
        doc.font('Helvetica').text(venueAddr, { width: valW });
      }

      doc.fontSize(9.5).font('Helvetica');
      const venueH = doc.heightOfString(venue, { width: valW });
      ry += Math.max(16, venueH + 2);

      ry += 8;

      // ── PERFORMERS section ───────────────────────────────────────────────
      const performers = data.performers && data.performers.length > 0 ? data.performers : null;
      if (performers && ry < H - 55) {
        doc.fontSize(13).font('Helvetica').fillColor(BLACK)
          .text('PERFORMERS:', MX, ry, { width: MW });
        ry += 18;

        for (const p of performers.slice(0, 6)) {
          if (ry >= H - 42) break;
          doc.circle(MX + 5, ry + 5.5, 2.5).fillOpacity(1).fill(BLACK);
          doc.fontSize(10).font('Helvetica').fillColor(BLACK)
            .text(p.ticketDisplayName, MX + 14, ry, { width: MW - 14 });
          ry += 15;
        }
        ry += 6;
      }

      // ── Special additions — plain text lines ─────────────────────────────
      const specials = data.specialAdditions && data.specialAdditions.length > 0 ? data.specialAdditions : null;
      if (specials && ry < H - 40) {
        for (const s of specials.slice(0, 3)) {
          if (ry >= H - 38) break;
          doc.fontSize(9.5).font('Helvetica').fillColor(BLACK)
            .text(s.ticketDisplayText, MX, ry, { width: MW });
          doc.fontSize(9.5).font('Helvetica');
          const sh = doc.heightOfString(s.ticketDisplayText, { width: MW });
          ry += Math.max(14, sh + 2);
        }
      }

      // ── Horizontal rule before T&C ───────────────────────────────────────
      doc.moveTo(MX, H - 23).lineTo(MX + MW, H - 23)
        .strokeColor(LGRAY).lineWidth(0.5).stroke();

      // ── T&C footer ───────────────────────────────────────────────────────
      doc.fontSize(7).font('Helvetica').fillColor(GRAY)
        .text('For Terms and Conditions, visit:banglafest.co.uk/terms', MX, H - 18, { width: MW });

      // ════════════════ RIGHT — QR stub (x 424–581) ════════════════════════
      const RX     = DIV_X + 8;          // 424
      const UUID_W = 12;                 // rotated UUID strip on far right
      const RW     = W - RX - UUID_W - 2; // ≈ 157

      // Large QR code — centred horizontally
      const QRS = 140;
      const QRX = RX + Math.round((RW - QRS) / 2);
      const QRY = 14;
      doc.image(qrBuffer!, QRX, QRY, { width: QRS, height: QRS });

      // "S C A N   A T   E N T R A N C E"
      const scanY = QRY + QRS + 10;
      doc.fontSize(7).font('Helvetica').fillColor(BLACK)
        .text('S C A N   A T   E N T R A N C E', RX, scanY, { width: RW, align: 'center' });

      // "ISSUED [date]"
      doc.fontSize(9).font('Helvetica-Bold').fillColor(BLACK)
        .text(`ISSUED ${fmtIssued(data.createdAt)}`, RX, scanY + 14, { width: RW, align: 'center' });

      // ── Rotated full UUID on far-right edge ──────────────────────────────
      const uuidX = W - 7;
      const uuidY = H / 2;
      doc.save()
        .fontSize(5.5)
        .font('Helvetica')
        .fillColor(GRAY)
        .rotate(-90, { origin: [uuidX, uuidY] })
        .text(data.ticketId.toUpperCase(), uuidX - 110, uuidY - 2, {
          width: 220,
          align: 'center',
          lineBreak: false,
        });
      doc.restore();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
