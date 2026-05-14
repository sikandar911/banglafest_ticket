import PDFDocument from 'pdfkit';

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
      // Fetch QR code from external API — no package
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(data.ticketId)}&ecc=H&margin=6`;
      const qrResponse = await fetch(qrUrl);
      if (!qrResponse.ok) throw new Error('QR API request failed');
      const qrBuffer = Buffer.from(await qrResponse.arrayBuffer());

      const W = 420;
      const H = 595;
      const doc = new PDFDocument({ size: [W, H], margin: 0 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ─── Page background ──────────────────────────────────────────────────
      doc.rect(0, 0, W, H).fill('#0c0c1a');

      // ─── Subtle dot pattern overlay ───────────────────────────────────────
      for (let x = 20; x < W; x += 30) {
        for (let y = 20; y < H; y += 30) {
          doc.circle(x, y, 0.8).fill('#1a1a30');
        }
      }

      // ─── Top accent bar ───────────────────────────────────────────────────
      doc.rect(0, 0, W, 5).fill('#e94560');

      // ─── Header block ─────────────────────────────────────────────────────
      doc.rect(0, 5, W, 155).fill('#12122a');

      // Brand name
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#e94560')
        .text('B A N G L A F E S T', 30, 22, { characterSpacing: 3 });

      // Tier badge (top right)
      const tierW = 90;
      doc.roundedRect(W - tierW - 20, 18, tierW, 24, 4).fill('#e94560');
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(data.tierName.toUpperCase(), W - tierW - 20, 25, { width: tierW, align: 'center', characterSpacing: 1 });

      // Event title
      doc
        .fontSize(data.eventTitle.length > 22 ? 18 : 22)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(data.eventTitle, 30, 52, { width: W - 60 });

      // Date & time
      const dateLine = data.eventDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      const timeLine = data.eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#8888b0')
        .text(`${dateLine}  ·  ${timeLine}`, 30, 106);

      if (data.location) {
        doc
          .fontSize(9)
          .fillColor('#8888b0')
          .text(`${data.location}`, 30, 122);
      }

      // ─── Perforated tear line ─────────────────────────────────────────────
      doc.circle(-8, 163, 12).fill('#0c0c1a');
      doc.circle(W + 8, 163, 12).fill('#0c0c1a');
      doc
        .moveTo(10, 163)
        .lineTo(W - 10, 163)
        .dash(5, { space: 5 })
        .strokeColor('#2a2a50')
        .lineWidth(1)
        .stroke()
        .undash();

      // ─── Holder section ───────────────────────────────────────────────────
      doc
        .fontSize(7)
        .font('Helvetica-Bold')
        .fillColor('#555580')
        .text('T I C K E T  H O L D E R', 30, 178, { characterSpacing: 2 });

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text(data.userName, 30, 192);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#7070a0')
        .text(data.userEmail, 30, 216);

      // ─── QR Code ─────────────────────────────────────────────────────────
      const qrSize = 160;
      const qrX = (W - qrSize) / 2;
      const qrY = 248;

      // QR container
      doc.roundedRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 10).fill('#ffffff');
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // Scan label
      doc
        .fontSize(7)
        .font('Helvetica-Bold')
        .fillColor('#555580')
        .text('S C A N  A T  E N T R A N C E', 0, qrY + qrSize + 18, {
          align: 'center', width: W, characterSpacing: 2,
        });

      // ─── Ticket ID (mono) ─────────────────────────────────────────────────
      doc
        .fontSize(6.5)
        .font('Helvetica')
        .fillColor('#333360')
        .text(data.ticketId.toUpperCase(), 0, qrY + qrSize + 34, {
          align: 'center', width: W, characterSpacing: 1,
        });

      // ─── Bottom strip ─────────────────────────────────────────────────────
      doc.rect(0, H - 55, W, 55).fill('#12122a');
      doc.rect(0, H - 4, W, 4).fill('#e94560');

      // Order + issued date
      const shortOrder = data.orderId.split('-')[0].toUpperCase();
      const issuedDate = data.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#555580')
        .text(`ORDER  #${shortOrder}`, 30, H - 42);
      doc
        .fontSize(8)
        .fillColor('#555580')
        .text(`ISSUED  ${issuedDate}`, W - 150, H - 42);

      // Decorative dots row
      const dotsY = H - 20;
      for (let i = 0; i < 9; i++) {
        doc.circle(W / 2 - 80 + i * 20, dotsY, 2).fill('#2a2a50');
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
