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
    // Dev mode: src/assets/logo.png (highest priority - original tiger logo)
    path.join(__dirname, '../assets/logo.png'),
    // Prod mode: dist/assets/logo.png (copied during build)
    path.join(process.cwd(), 'dist/assets/logo.png'),
    // Fallback: other locations
    path.join(process.cwd(), 'src/assets/logo.png'),
    path.join(process.cwd(), 'assets/logo.png'),
    path.join(__dirname, '../../src/assets/logo.png'),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        console.log(`[PDF Service] Logo found at: ${candidate}`);
        return candidate;
      }
    } catch (err) {
      // Continue to next candidate
    }
  }

  console.warn(`[PDF Service] Logo not found. Checked:`, candidates);
  return null;
}

function resolveAmbrosianLogoPath(): string | null {
  const candidates = [
    // Prod mode: dist/assets/ambrosian wide.png (from dist directory, __dirname is dist)
    path.join(__dirname, 'assets/ambrosian wide.png'),
    // Fallback prod: from cwd
    path.join(process.cwd(), 'dist/assets/ambrosian wide.png'),
    // Dev mode: public/ambrosian wide.png
    path.join(__dirname, '../../public/ambrosian wide.png'),
    path.join(process.cwd(), 'public/ambrosian wide.png'),
    // Other fallback locations
    path.join(process.cwd(), 'src/../public/ambrosian wide.png'),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        console.log(`[PDF Service] Ambrosian logo found at: ${candidate}`);
        return candidate;
      }
    } catch (err) {
      // Continue to next candidate
    }
  }

  console.warn(`[PDF Service] Ambrosian logo not found.`);
  return null;
}

// Resolve at module load with fallback across dev/prod layouts.
const LOGO_PATH = resolveLogoPath();
const AMBROSIAN_LOGO_PATH = resolveAmbrosianLogoPath();

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

  // Ambrosian Logo (enlarged, top left)
  if (AMBROSIAN_LOGO_PATH) {
    doc.image(AMBROSIAN_LOGO_PATH, 6, offsetY + 2, {
      fit: [180, 66],
    });
  }

  // PRESENTS text (placed directly under Ambrosian logo - no gap)
  doc.fontSize(10).font('Helvetica-Bold').fillColor(BRAND_ORANGE)
    .text('PRESENTS', 6, offsetY + 48, { width: 180, align: 'center' });

  // Banglafest Logo (shrunken to fit under Ambrosian block) - reduced gap
  const LW = 180;
  const logoY = offsetY + 40; // compressed spacing between logos
  if (LOGO_PATH) {
    doc.image(LOGO_PATH, 0, logoY, {
      fit: [LW, PAGE_HEIGHT - logoY + offsetY],
      align: 'center',
      valign: 'center',
    });
  } else {
    doc.rect(0, logoY, LW, PAGE_HEIGHT - logoY + offsetY).fill('#f6f6f6');
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#222222')
      .text('BANGLAFEST', 24, logoY + (PAGE_HEIGHT - logoY + offsetY) / 2 - 12, { width: LW - 48, align: 'center' });
  }

  const DIV_X = 395;
  doc.moveTo(DIV_X, offsetY + 16).lineTo(DIV_X, offsetY + PAGE_HEIGHT - 16)
    .strokeColor(LGRAY)
    .lineWidth(0.8)
    .stroke();

  const MX = 222;
  const MW = DIV_X - MX - 3;
  const LBL_W = 52;
  let ry = offsetY + 24; // Add space before OFFICIAL ENTRY PASS

  doc.rect(MX, ry - 3, 3.2, 22).fill(BRAND_ORANGE);
  doc.fontSize(13).font('Helvetica-Bold').fillColor(BLACK)
    .text('OFFICIAL ENTRY PASS', MX + 10, ry, { width: MW - 10 });
  ry += 28; // Increased for better spacing

  // DATE row - centered value
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BRAND_ORANGE)
    .text('DATE:', MX, ry, { width: 50, lineBreak: false });
  doc.fontSize(10.2).font('Helvetica-Bold').fillColor(BLACK)
    .text(fmtDate(data.eventDate), MX + 50, ry, { width: MW - 50, align: 'center' });
  ry += 13; // Increased from 12

  // VENUE row - centered value
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BRAND_ORANGE)
    .text('VENUE:', MX, ry, { width: 50, lineBreak: false });

  const venue = data.location || 'To Be Announced';
  const commaIdx = venue.indexOf(',');
  const venueName = commaIdx > -1 ? venue.slice(0, commaIdx).trim() : venue;
  const venueCity = commaIdx > -1 ? venue.slice(commaIdx + 1).trim() : '';

  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BLACK)
    .text(venueName, MX + 50, ry, { width: MW - 50, align: 'center' });
  if (venueCity) {
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(BLACK)
      .text(venueCity, MX + 50, ry + 10, { width: MW - 50, align: 'center' });
    ry += 24; // Increased from 22
  } else {
    ry += 13; // Increased from 12
  }

  ry += 10; // Increased from 8

  const performers = data.performers && data.performers.length > 0 ? data.performers : null;
  if (performers && ry < offsetY + PAGE_HEIGHT - 25) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor(BRAND_ORANGE)
      .text('PERFORMERS:', MX, ry, { width: MW });
    ry += 13; // Reduced from 18

    for (const performer of performers) {
      if (ry >= offsetY + PAGE_HEIGHT - 24) break;
      doc.circle(MX + 5, ry + 3.5, 2.5).fillOpacity(1).fill(BRAND_ORANGE);
      doc.fontSize(8.5).font('Helvetica').fillColor('#1a1a1a')
        .text(truncateText(performer.ticketDisplayName, 30), MX + 14, ry, { width: MW - 14 });
      ry += 11; // Reduced from 15
    }
    ry += 2; // Reduced from 6
  }

  // Add more spacing before special additions
  ry += 12;

  const specials = data.specialAdditions && data.specialAdditions.length > 0 ? data.specialAdditions : null;
  if (specials && ry < offsetY + PAGE_HEIGHT - 25) {
    for (const special of specials) {
      if (ry >= offsetY + PAGE_HEIGHT - 22) break;
      
      // Split special addition text into 2 lines without truncation
      const fullText = special.ticketDisplayText;
      const maxCharsPerLine = 42;
      let line1 = fullText;
      let line2 = '';
      
      if (fullText.length > maxCharsPerLine) {
        const mid = fullText.lastIndexOf(' ', maxCharsPerLine);
        const splitIdx = mid > 20 ? mid : maxCharsPerLine;
        line1 = fullText.slice(0, splitIdx).trim();
        line2 = fullText.slice(splitIdx).trim();
      }
      
      doc.fontSize(8.5).font('Helvetica').fillColor('#1a1a1a')
        .text(line1, MX, ry, { width: MW });
      if (line2) {
        doc.fontSize(8.5).font('Helvetica').fillColor('#1a1a1a')
          .text(line2, MX, ry + 11, { width: MW });
        ry += 22;
      } else {
        ry += 11;
      }
    }
  }

  doc.moveTo(MX, offsetY + PAGE_HEIGHT - 18).lineTo(MX + MW, offsetY + PAGE_HEIGHT - 18)
    .strokeColor(BRAND_ORANGE).lineWidth(0.8).stroke();

  doc.fontSize(6).font('Helvetica').fillColor(GRAY)
    .text('Terms & Conditions: banglafest.co.uk/terms', MX, offsetY + PAGE_HEIGHT - 14, { width: MW });

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
    .text(data.ticketId, uuidX - QRS / 2, uuidCenterY - 2, {
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

  const ambrosianLogoDataUri = AMBROSIAN_LOGO_PATH
    ? `data:image/png;base64,${fs.readFileSync(AMBROSIAN_LOGO_PATH).toString('base64')}`
    : null;

  const venue = data.location || 'To Be Announced';
  const venueCommaIndex = venue.indexOf(',');
  const venueName = venueCommaIndex > -1 ? venue.slice(0, venueCommaIndex).trim() : venue;
  const venueCity = venueCommaIndex > -1 ? venue.slice(venueCommaIndex + 1).trim() : '';

  const performerLines = (data.performers ?? []).map((p) => truncateText(p.ticketDisplayName, 30));
  
  // Handle special additions with 2-line wrapping without truncation
  let specialLine1 = '';
  let specialLine2 = '';
  if (data.specialAdditions?.[0]?.ticketDisplayText) {
    const fullText = data.specialAdditions[0].ticketDisplayText;
    const maxCharsPerLine = 42;
    if (fullText.length > maxCharsPerLine) {
      const mid = fullText.lastIndexOf(' ', maxCharsPerLine);
      const splitIdx = mid > 20 ? mid : maxCharsPerLine;
      specialLine1 = fullText.slice(0, splitIdx).trim();
      specialLine2 = fullText.slice(splitIdx).trim();
    } else {
      specialLine1 = fullText;
    }
  }

  // Calculate Banglafest logo Y position to match PDF - compressed spacing
  const banglafestLogoY = 76;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}">
  <defs>
    <style>
      text { font-family: 'Arial', 'Helvetica', 'Liberation Sans', 'DejaVu Sans', 'sans-serif'; font-size: inherit; }
    </style>
  </defs>
  
  <rect x="0" y="0" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="#ffffff"/>
  <rect x="2" y="2" width="${PAGE_WIDTH - 4}" height="${PAGE_HEIGHT - 4}" rx="8" ry="8" fill="none" stroke="#444444" stroke-width="1.3" stroke-dasharray="7 5"/>

  <!-- Ambrosian Logo at top left -->
  ${ambrosianLogoDataUri
    ? `<image href="${ambrosianLogoDataUri}" x="2" y="2" width="180" height="66" preserveAspectRatio="xMinYMin meet"/>`
    : ''}
  
  <!-- Banglafest Logo (shrunk to fit under Ambrosian) -->
  ${logoDataUri
    ? `<image href="${logoDataUri}" x="0" y="${banglafestLogoY}" width="180" height="${PAGE_HEIGHT - banglafestLogoY}" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect x="0" y="${banglafestLogoY}" width="180" height="${PAGE_HEIGHT - banglafestLogoY}" fill="#f6f6f6"/><text x="90" y="165" fill="#222222" text-anchor="middle" font-size="20" font-weight="bold" font-family="Arial, Helvetica, sans-serif">BANGLAFEST</text>`}

  <line x1="395" y1="24" x2="395" y2="239" stroke="#cccccc" stroke-width="0.8"/>

  <rect x="222" y="24" width="3.2" height="28" fill="${BRAND_ORANGE}"/>
  
  <rect x="419" y="24" width="155" height="155" fill="none" stroke="${BRAND_ORANGE}" stroke-width="1"/>
  <image href="${qrDataUri}" x="424" y="29" width="145" height="145"/>

  <!-- All text elements drawn last (appear on top with z-index) -->
  <!-- PRESENTS text (centered under Ambrosian) - appears on top -->
  <text x="92" y="72" fill="#f26522" font-size="10" font-weight="bold" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">PRESENTS</text>

  <text x="232" y="38" fill="#000000" font-size="13" font-weight="bold" font-family="Arial, Helvetica, sans-serif">OFFICIAL ENTRY PASS</text>

  <text x="222" y="54" fill="${BRAND_ORANGE}" font-size="9.5" font-weight="bold" font-family="Arial, Helvetica, sans-serif">DATE:</text>
  <text x="297" y="54" fill="#000000" font-size="10" font-weight="bold" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">${xmlEscape(fmtDate(data.eventDate))}</text>

  <text x="222" y="67" fill="${BRAND_ORANGE}" font-size="9.5" font-weight="bold" font-family="Arial, Helvetica, sans-serif">VENUE:</text>
  <text x="297" y="67" fill="#000000" font-size="9.5" font-weight="bold" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">${xmlEscape(truncateText(venueName, 28))}</text>
  ${venueCity ? `<text x="297" y="78" fill="#000000" font-size="9.5" font-weight="bold" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">${xmlEscape(truncateText(venueCity, 28))}</text>` : ''}

  <text x="222" y="91" fill="${BRAND_ORANGE}" font-size="12" font-weight="bold" font-family="Arial, Helvetica, sans-serif">PERFORMERS:</text>

  ${performerLines.map((line, index) => {
    const y = 104 + index * 11;
    return `<circle cx="227" cy="${y - 2}" r="2" fill="${BRAND_ORANGE}"/><text x="235" y="${y}" fill="#1a1a1a" font-size="8.5" font-family="Arial, Helvetica, sans-serif">${xmlEscape(line)}</text>`;
  }).join('')}

  ${specialLine1 ? `<text x="222" y="178" fill="#1a1a1a" font-size="8.5" font-family="Arial, Helvetica, sans-serif">${xmlEscape(specialLine1)}</text>` : ''}
  ${specialLine2 ? `<text x="222" y="189" fill="#1a1a1a" font-size="8.5" font-family="Arial, Helvetica, sans-serif">${xmlEscape(specialLine2)}</text>` : ''}

  <line x1="222" y1="197" x2="391" y2="197" stroke="${BRAND_ORANGE}" stroke-width="0.8"/>
  <text x="222" y="206" fill="#666666" font-size="6" font-family="Arial, Helvetica, sans-serif">Terms &amp; Conditions: banglafest.co.uk/terms</text>

  <text x="496" y="188" fill="${BRAND_ORANGE}" font-size="7" font-weight="bold" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">SCAN AT ENTRANCE</text>
  <text x="496" y="199" fill="#000000" font-size="10" font-weight="bold" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">ISSUED ${xmlEscape(fmtIssued(data.createdAt))}</text>
  <text x="496" y="212" fill="#1a1a1a" font-size="8.5" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">FAN: ${xmlEscape(truncateText(data.attendeeName || data.userName, 22))}</text>
  <text x="496" y="223" fill="#1a1a1a" font-size="8.5" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">${xmlEscape(truncateText(data.tierName, 20))}</text>

  <g transform="translate(585 100) rotate(-90)">
    <text x="0" y="0" fill="${BRAND_ORANGE}" font-size="6" font-weight="bold" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">${xmlEscape(data.ticketId)}</text>
  </g>
</svg>`;

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: PAGE_WIDTH,
    },
    font: {
      loadSystemFonts: true,
      fontDirs: [
        '/usr/share/fonts',
        '/usr/local/share/fonts',
        '/usr/share/fonts/truetype',
        '/usr/share/fonts/opentype',
        'C:\\Windows\\Fonts',
        'C:\\Program Files\\Common Files\\Adobe\\Fonts',
      ],
    },
  });

  try {
    const image = resvg.render();
    return image.asPng();
  } catch (err) {
    console.error('[PDF Service] Error rendering PNG ticket:', err);
    console.error('[PDF Service] SVG length:', svg.length);
    throw err;
  }
}
