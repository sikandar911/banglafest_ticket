import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

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
}

export async function generateTicketPdf(data: TicketPdfData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Generate QR code as PNG buffer
      const qrBuffer = await QRCode.toBuffer(data.ticketId, {
        errorCorrectionLevel: 'H',
        width: 200,
        margin: 1,
      });

      const doc = new PDFDocument({ size: 'A5', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ─── Header ───────────────────────────────────────────────────────────
      doc
        .rect(0, 0, doc.page.width, 80)
        .fill('#1a1a2e');

      doc
        .fillColor('white')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('🎟 BANGLAFEST', 40, 22, { align: 'left' });

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Official Ticket', 40, 52, { align: 'left' });

      // ─── Event Info ───────────────────────────────────────────────────────
      doc.moveDown(3);

      doc
        .fillColor('#1a1a2e')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(data.eventTitle, { align: 'center' });

      doc.moveDown(0.5);

      doc
        .fontSize(12)
        .fillColor('#e94560')
        .font('Helvetica-Bold')
        .text(data.tierName.toUpperCase(), { align: 'center' });

      doc.moveDown(0.5);

      const eventDateStr = data.eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      doc
        .fontSize(10)
        .fillColor('#333')
        .font('Helvetica')
        .text(`📅 ${eventDateStr}`, { align: 'center' });

      if (data.location) {
        doc.text(`📍 ${data.location}`, { align: 'center' });
      }

      // ─── Divider ──────────────────────────────────────────────────────────
      doc.moveDown(1);
      doc
        .moveTo(40, doc.y)
        .lineTo(doc.page.width - 40, doc.y)
        .strokeColor('#e0e0e0')
        .dash(4, { space: 4 })
        .stroke()
        .undash();

      // ─── Holder Info ──────────────────────────────────────────────────────
      doc.moveDown(1);
      doc
        .fontSize(10)
        .fillColor('#666')
        .font('Helvetica')
        .text('TICKET HOLDER', { align: 'center' });

      doc
        .fontSize(13)
        .fillColor('#1a1a2e')
        .font('Helvetica-Bold')
        .text(data.userName, { align: 'center' });

      doc
        .fontSize(9)
        .fillColor('#888')
        .font('Helvetica')
        .text(data.userEmail, { align: 'center' });

      // ─── QR Code ──────────────────────────────────────────────────────────
      doc.moveDown(1);
      const qrX = (doc.page.width - 140) / 2;
      doc.image(qrBuffer, qrX, doc.y, { width: 140 });
      doc.moveDown(0.5);
      doc.y += 140;

      doc
        .fontSize(7)
        .fillColor('#aaa')
        .text('Scan at the gate', { align: 'center' });

      // ─── Ticket ID ────────────────────────────────────────────────────────
      doc.moveDown(0.5);
      doc
        .fontSize(7)
        .fillColor('#bbb')
        .text(`ID: ${data.ticketId}`, { align: 'center' });

      // ─── Footer ───────────────────────────────────────────────────────────
      doc
        .rect(0, doc.page.height - 35, doc.page.width, 35)
        .fill('#f4f4f4');

      doc
        .fontSize(8)
        .fillColor('#999')
        .text(
          `Order: ${data.orderId.slice(0, 8).toUpperCase()} | Issued: ${data.createdAt.toLocaleDateString()}`,
          0,
          doc.page.height - 22,
          { align: 'center', width: doc.page.width }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
