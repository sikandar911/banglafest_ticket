import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { Resvg } from '@resvg/resvg-js';

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
  attendeeName?: string;
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

function resolveLogoPath(): string | null {
  const candidates = [
    path.join(__dirname, '../assets/logo.png'),
    path.join(process.cwd(), 'dist/assets/logo.png'),
    path.join(process.cwd(), 'src/assets/logo.png'),
    path.join(process.cwd(), 'assets/logo.png'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

// Resolve at module load with fallback across dev/prod layouts.
const LOGO_PATH = resolveLogoPath();

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 255;
const BRAND_ORANGE = '#f26522';

async function fetchQrBuffer(ticketId: string): Promise<Buffer> {
  return QRCode.toBuffer(ticketId, {
    type: 'png',
    width: 400,
    errorCorrectionLevel: 'H',
    margin: 2,
  });
}

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function drawTicketPage(doc: InstanceType<typeof PDFDocument>, data: TicketPdfData, qrBuffer: Buffer, offsetY: number = 0): void {
  const WHITE = '#ffffff';
  const BLACK = '#000000';
  const GRAY = '#666666';
  const LGRAY = '#cccccc';

  // Draw background and border at offsetY
  doc.rect(0, offsetY, PAGE_WIDTH, PAGE_HEIGHT).fill(WHITE);

  doc.roundedRect(2, offsetY + 2, PAGE_WIDTH - 4, PAGE_HEIGHT - 4, 8)
    .dash(5, { space: 3 })
    .strokeColor('#444444')
    .lineWidth(1.3)
    .stroke()
    .undash();

  const LW = 215;
  if (LOGO_PATH) {
    doc.image(LOGO_PATH, 0, offsetY, {
      fit: [LW, PAGE_HEIGHT],
      align: 'center',
      valign: 'center',
    });
  } else {
    doc.rect(0, offsetY, LW, PAGE_HEIGHT).fill('#f6f6f6');
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#222222')
      .text('BANGLAFEST', 24, offsetY + PAGE_HEIGHT / 2 - 12, { width: LW - 48, align: 'center' });
  }

  const DIV_X = 395;
  doc.moveTo(DIV_X, offsetY + 16).lineTo(DIV_X, offsetY + PAGE_HEIGHT - 16)
    .strokeColor(LGRAY)
    .lineWidth(0.8)
    .stroke();

  const MX = 222;
  const MW = DIV_X - MX - 3;
  const LBL_W = 52;
  let ry = offsetY + 14;

  doc.rect(MX, ry - 3, 3.2, 22).fill(BRAND_ORANGE);
  doc.fontSize(13).font('Helvetica-Bold').fillColor(BLACK)
    .text('OFFICIAL ENTRY PASS', MX + 10, ry, { width: MW - 10 });
  ry += 30;

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BRAND_ORANGE)
    .text('DATE:', MX, ry, { width: LBL_W, lineBreak: false });
  doc.fontSize(10.2).font('Helvetica-Bold').fillColor(BLACK)
    .text(fmtDate(data.eventDate), MX + LBL_W, ry, { width: MW - LBL_W });
  ry += 16;

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BRAND_ORANGE)
    .text('VENUE:', MX, ry, { width: LBL_W, lineBreak: false });

  const venue = data.location || 'To Be Announced';
  const commaIdx = venue.indexOf(',');
  const venueName = commaIdx > -1 ? venue.slice(0, commaIdx).trim() : venue;
  const venueCity = commaIdx > -1 ? venue.slice(commaIdx + 1).trim() : '';
  const valX = MX + LBL_W;
  const valW = MW - LBL_W;

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BLACK)
    .text(venueName, valX, ry, { width: valW, lineBreak: false });
  if (venueCity) {
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BLACK)
      .text(venueCity, valX, ry + 13, { width: valW, lineBreak: false });
    ry += 28;
  } else {
    ry += 16;
  }

  ry += 22;

  const performers = data.performers && data.performers.length > 0 ? data.performers : null;
  if (performers && ry < offsetY + PAGE_HEIGHT - 55) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor(BRAND_ORANGE)
      .text('PERFORMERS:', MX, ry, { width: MW });
    ry += 18;

    for (const performer of performers.slice(0, 6)) {
      if (ry >= offsetY + PAGE_HEIGHT - 42) break;
      doc.circle(MX + 5, ry + 5.5, 2.5).fillOpacity(1).fill(BRAND_ORANGE);
      doc.fontSize(10).font('Helvetica').fillColor('#1a1a1a')
        .text(performer.ticketDisplayName, MX + 14, ry, { width: MW - 14 });
      ry += 15;
    }
    ry += 6;
  }

  const specials = data.specialAdditions && data.specialAdditions.length > 0 ? data.specialAdditions : null;
  if (specials && ry < offsetY + PAGE_HEIGHT - 40) {
    for (const special of specials.slice(0, 3)) {
      if (ry >= offsetY + PAGE_HEIGHT - 38) break;
      doc.fontSize(10).font('Helvetica').fillColor('#1a1a1a')
        .text(special.ticketDisplayText, MX, ry, { width: MW });
      doc.fontSize(9.5).font('Helvetica');
      const specialHeight = doc.heightOfString(special.ticketDisplayText, { width: MW });
      ry += Math.max(14, specialHeight + 2);
    }
  }

  doc.moveTo(MX, offsetY + PAGE_HEIGHT - 23).lineTo(MX + MW, offsetY + PAGE_HEIGHT - 23)
    .strokeColor(BRAND_ORANGE).lineWidth(1).stroke();

  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
    .text('Terms & Conditions: banglafest.co.uk/terms', MX, offsetY + PAGE_HEIGHT - 18, { width: MW });

  const RX = DIV_X + 10;
  const UUID_W = 12;
  const RW = PAGE_WIDTH - RX - UUID_W - 4;

  const QRS = 145;
  const QRX = RX + Math.round((RW - QRS) / 2);
  const QRY = offsetY + 12;

  doc.rect(QRX - 5, QRY - 5, QRS + 10, QRS + 10)
    .lineWidth(1)
    .strokeColor(BRAND_ORANGE)
    .stroke();
  doc.image(qrBuffer, QRX, QRY, { width: QRS, height: QRS });

  const scanY = QRY + QRS + 10;
  doc.fontSize(7.3).font('Helvetica-Bold').fillColor(BRAND_ORANGE)
    .text('SCAN AT ENTRANCE', RX, scanY, { width: RW, align: 'center' });

  doc.fontSize(10).font('Helvetica-Bold').fillColor(BLACK)
    .text(`ISSUED ${fmtIssued(data.createdAt)}`, RX, scanY + 14, { width: RW, align: 'center' });

  doc.fontSize(8.5).font('Helvetica').fillColor('#1a1a1a')
    .text(`FAN: ${data.attendeeName || data.userName}`, RX, scanY + 31, { width: RW, align: 'center' });

  doc.fontSize(8.5).font('Helvetica').fillColor('#1a1a1a')
    .text(data.tierName, RX, scanY + 42, { width: RW, align: 'center' });

  const uuidX = PAGE_WIDTH - 14;
  const uuidCenterY = QRY + QRS / 2;
  doc.save()
    .fontSize(7)
    .font('Helvetica')
    .fillColor(BRAND_ORANGE)
    .rotate(-90, { origin: [uuidX, uuidCenterY] })
    .text(data.ticketId.toUpperCase(), uuidX - QRS / 2, uuidCenterY - 2, {
      width: QRS,
      align: 'center',
      lineBreak: false,
    });
  doc.restore();
}

export async function generateTicketPdf(data: TicketPdfData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const qrBuffer = await fetchQrBuffer(data.ticketId);
      const doc = new PDFDocument({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      drawTicketPage(doc, data, qrBuffer, 0);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateTicketsPdf(dataList: TicketPdfData[]): Promise<Buffer> {
  if (dataList.length === 0) {
    throw new Error('No tickets provided.');
  }

  const qrBuffers = await Promise.all(dataList.map((data) => fetchQrBuffer(data.ticketId)));

  return new Promise((resolve, reject) => {
    const A4_WIDTH = 595;
    const A4_HEIGHT = 842;
    const TICKET_HEIGHT = PAGE_HEIGHT; // 255
    const TICKET_SPACING = 12;
    const TICKETS_PER_PAGE = 3;

    const doc = new PDFDocument({ size: [A4_WIDTH, A4_HEIGHT], margin: 0 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    dataList.forEach((data, index) => {
      const pageIndex = Math.floor(index / TICKETS_PER_PAGE);
      const ticketIndexOnPage = index % TICKETS_PER_PAGE;

      // Add new page if needed
      if (index > 0 && ticketIndexOnPage === 0) {
        doc.addPage({ size: [A4_WIDTH, A4_HEIGHT], margin: 0 });
      }

      // Calculate offset Y for this ticket on the page
      const offsetY = TICKET_SPACING + ticketIndexOnPage * (TICKET_HEIGHT + TICKET_SPACING);

      // Draw the ticket at this offset
      drawTicketPage(doc, data, qrBuffers[index], offsetY);
    });

    doc.end();
  });
}

export async function generateTicketPng(data: TicketPdfData): Promise<Buffer> {
  const qrBuffer = await fetchQrBuffer(data.ticketId);
  const qrDataUri = `data:image/png;base64,${qrBuffer.toString('base64')}`;

  const logoDataUri = LOGO_PATH
    ? `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`
    : null;

  const venue = data.location || 'To Be Announced';
  const venueCommaIndex = venue.indexOf(',');
  const venueName = venueCommaIndex > -1 ? venue.slice(0, venueCommaIndex).trim() : venue;
  const venueCity = venueCommaIndex > -1 ? venue.slice(venueCommaIndex + 1).trim() : '';

  const performerLines = (data.performers ?? []).slice(0, 4).map((p) => truncateText(p.ticketDisplayName, 28));
  
  // Handle special additions with 2-line wrapping if needed
  let specialLine1 = '';
  let specialLine2 = '';
  if (data.specialAdditions?.[0]?.ticketDisplayText) {
    const fullText = data.specialAdditions[0].ticketDisplayText;
    if (fullText.length > 45) {
      const mid = fullText.lastIndexOf(' ', 45);
      const splitIdx = mid > 30 ? mid : 45;
      specialLine1 = truncateText(fullText.slice(0, splitIdx), 45);
      specialLine2 = truncateText(fullText.slice(splitIdx + 1), 45);
    } else {
      specialLine1 = truncateText(fullText, 45);
    }
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}">
  <rect x="0" y="0" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#ffffff"/>
  <rect x="2" y="2" width="${PAGE_WIDTH - 4}" height="${PAGE_HEIGHT - 4}" rx="8" ry="8" fill="none" stroke="#444444" stroke-width="1.3" stroke-dasharray="7 5"/>

  ${logoDataUri
    ? `<image href="${logoDataUri}" x="0" y="0" width="215" height="${PAGE_HEIGHT}" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect x="0" y="0" width="215" height="${PAGE_HEIGHT}" fill="#f6f6f6"/><text x="107" y="128" fill="#222" text-anchor="middle" font-size="22" font-family="Arial" font-weight="700">BANGLAFEST</text>`}

  <line x1="395" y1="16" x2="395" y2="239" stroke="#cccccc" stroke-width="0.8"/>

  <rect x="222" y="15" width="3.2" height="32" fill="${BRAND_ORANGE}"/>
  <text x="232" y="30" fill="#000" font-size="13" font-family="Arial" font-weight="700">OFFICIAL ENTRY PASS</text>

  <text x="222" y="58" fill="${BRAND_ORANGE}" font-size="9.5" font-family="Arial" font-weight="700">DATE:</text>
  <text x="274" y="58" fill="#000" font-size="10.5" font-family="Georgia">${xmlEscape(fmtDate(data.eventDate))}</text>

  <text x="222" y="74" fill="${BRAND_ORANGE}" font-size="9.5" font-family="Arial" font-weight="700">VENUE:</text>
  <text x="274" y="74" fill="#000" font-size="9.5" font-family="Arial" font-weight="700">${xmlEscape(truncateText(venueName, 24))}</text>
  <text x="274" y="89" fill="#000" font-size="9" font-family="Arial" font-weight="700">${xmlEscape(truncateText(venueCity, 30))}</text>

  <text x="222" y="106" fill="${BRAND_ORANGE}" font-size="14" font-family="Arial" font-weight="700">PERFORMERS:</text>

  ${performerLines.map((line, index) => {
    const y = 120 + index * 14;
    return `<circle cx="227" cy="${y - 4}" r="2.5" fill="${BRAND_ORANGE}"/><text x="236" y="${y}" fill="#1a1a1a" font-size="10" font-family="Arial">${xmlEscape(line)}</text>`;
  }).join('')}

  ${specialLine1 ? `<text x="222" y="205" fill="#1a1a1a" font-size="10" font-family="Arial">${xmlEscape(specialLine1)}</text>` : ''}
  ${specialLine2 ? `<text x="222" y="218" fill="#1a1a1a" font-size="10" font-family="Arial">${xmlEscape(specialLine2)}</text>` : ''}

  <line x1="222" y1="232" x2="391" y2="232" stroke="${BRAND_ORANGE}" stroke-width="1"/>
  <text x="222" y="248" fill="#666666" font-size="7" font-family="Arial">Terms &amp; Conditions: banglafest.co.uk/terms</text>

  <rect x="419" y="7" width="155" height="155" fill="none" stroke="${BRAND_ORANGE}" stroke-width="1"/>
  <image href="${qrDataUri}" x="424" y="12" width="145" height="145"/>

  <text x="496" y="176" fill="${BRAND_ORANGE}" font-size="7.3" text-anchor="middle" font-family="Arial" font-weight="700">SCAN AT ENTRANCE</text>
  <text x="496" y="191" fill="#000" font-size="10" text-anchor="middle" font-family="Arial" font-weight="700">ISSUED ${xmlEscape(fmtIssued(data.createdAt))}</text>
  <text x="496" y="208" fill="#1a1a1a" font-size="8.5" text-anchor="middle" font-family="Arial">FAN: ${xmlEscape(truncateText(data.attendeeName || data.userName, 22))}</text>
  <text x="496" y="220" fill="#1a1a1a" font-size="8" text-anchor="middle" font-family="Arial">${xmlEscape(truncateText(data.tierName, 20))}</text>

  <g transform="translate(585 84.5) rotate(-90)">
    <text x="0" y="0" fill="${BRAND_ORANGE}" font-size="5.5" text-anchor="middle" font-family="Arial">${xmlEscape(data.ticketId.toUpperCase())}</text>
  </g>
</svg>`;

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: PAGE_WIDTH * 2,
    },
  });

  return resvg.render().asPng();
}
