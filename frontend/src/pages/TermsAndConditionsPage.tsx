import { Link, useNavigate } from 'react-router-dom';
import { Ticket, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function TermsAndConditionsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <img 
              src="/banglafest-flat-logo.png" 
              alt="Banglafest Logo" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-2xl font-bold">Terms & Conditions</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8 text-gray-300">
          {/* Last Updated */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">
              <span className="font-semibold text-white">Last Updated:</span> May 21, 2026
            </p>
          </div>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Agreement to Terms</h2>
            <p className="mb-4">
              These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("User," "you," or "Customer") and Banglafest ("Company," "we," "our," or "us"). By accessing, browsing, registering on, or using the Banglafest ticketing platform (the "Platform"), you acknowledge that you have read, understood, and agree to be bound by these Terms, including our Privacy Policy and all other referenced policies and procedures.
            </p>
            <p>
              If you do not agree with any part of these Terms, you must discontinue use of the Platform immediately. Your continued use of the Platform following any modifications to these Terms constitutes your acceptance of such changes.
            </p>
          </section>

          {/* Refund Policy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-red-500" />
              No Refund Policy
            </h2>
            <div className="bg-red-950/30 border border-red-800 rounded-lg p-6 space-y-4">
              <p>
                <span className="font-semibold text-white">Refunds are NOT available under any circumstances</span> once a ticket has been purchased and the transaction has been processed and confirmed.
              </p>
              <div className="space-y-3">
                <p className="font-semibold text-white">This includes, but is not limited to:</p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>Inability or unwillingness to attend the event</li>
                  <li>Dissatisfaction with the event experience</li>
                  <li>Personal circumstances or emergencies</li>
                  <li>Changes in personal plans</li>
                  <li>Involuntary cancellation by the Company (in which case a voucher for a future event may be offered at our discretion)</li>
                  <li>Force majeure events (natural disasters, government restrictions, pandemics, etc.)</li>
                </ul>
              </div>
              <p className="pt-2 border-t border-red-700">
                By purchasing a ticket, you explicitly acknowledge and accept that your payment is non-refundable and final.
              </p>
            </div>
          </section>

          {/* Data Privacy & GDPR */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Data Privacy & UK GDPR Compliance</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Data Collection</h3>
                <p>
                  We collect personal data including but not limited to: name, email address, contact number, payment information, and event attendance details. This data is collected solely to facilitate your ticket purchase, provide customer support, and improve our services.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Data Protection & Confidentiality</h3>
                <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-4 space-y-3">
                  <p className="font-semibold text-white">
                    Your personal data will be kept strictly confidential and will NOT be:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-300">
                    <li>Shared with third parties without your explicit consent</li>
                    <li>Publicly disclosed or displayed on the internet</li>
                    <li>Sold, rented, or leased to external organizations</li>
                    <li>Used for marketing purposes without your prior written consent</li>
                    <li>Stored on insecure or unencrypted databases</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">UK GDPR Compliance</h3>
                <p className="mb-3">
                  Banglafest is compliant with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. As a User, you have the following rights:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li><span className="font-semibold">Right to Access:</span> You can request access to your personal data at any time</li>
                  <li><span className="font-semibold">Right to Rectification:</span> You can correct inaccurate or incomplete data</li>
                  <li><span className="font-semibold">Right to Erasure:</span> You can request deletion of your data (subject to legal obligations)</li>
                  <li><span className="font-semibold">Right to Object:</span> You can object to processing of your personal data</li>
                  <li><span className="font-semibold">Right to Data Portability:</span> You can request your data in a machine-readable format</li>
                  <li><span className="font-semibold">Right to Withdraw Consent:</span> You can withdraw consent for data processing at any time</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Data Security</h3>
                <p>
                  We implement industry-standard security measures including SSL/TLS encryption, secure payment gateways, firewalls, and regular security audits to protect your data from unauthorized access, breaches, or loss. All payment information is processed through PCI-DSS compliant payment processors and is never stored on our servers.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Contact for Data Requests</h3>
                <p>
                  For any data privacy inquiries or to exercise your GDPR rights, please contact us at <span className="font-semibold text-white">connect@ambrosianuk.com</span>. We will respond to all requests within 30 days of receipt.
                </p>
              </div>
            </div>
          </section>

          {/* Ticket Usage Terms */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Ticket Usage Terms</h2>
            <div className="space-y-3 text-gray-300">
              <p>
                <span className="font-semibold text-white">Ticket Ownership:</span> Tickets are personal and non-transferable. The name associated with the ticket must match the ID presented at the event venue.
              </p>
              <p>
                <span className="font-semibold text-white">Ticket Retrieval & Verification:</span> If a ticket is lost, it can be collected at any time by accessing your account via the associated email address (Gmail). On event days, all tickets will be verified using a real-time scanner for authenticity and validity.
              </p>
              <p>
                <span className="font-semibold text-white">Ticket Validity:</span> Tickets are valid only for the event date, time, and venue specified at the time of purchase. Altered, duplicated, or fraudulent tickets will not be accepted and may result in legal action.
              </p>
              <p>
                <span className="font-semibold text-white">Entry Rights:</span> We reserve the right to refuse entry to anyone deemed to be in violation of event policies, venue rules, or applicable laws.
              </p>
              <p>
                <span className="font-semibold text-white">Resale & Scalping:</span> Reselling tickets above face value or through unauthorized channels is strictly prohibited and may result in legal consequences.
              </p>
            </div>
          </section>

          {/* User Responsibilities */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">User Responsibilities</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You must provide accurate and complete information during registration and checkout</li>
              <li>You must not use the Platform for fraudulent, illegal, or unauthorized purposes</li>
              <li>You must comply with all applicable laws and regulations</li>
              <li>You are responsible for reviewing event details before purchase</li>
            </ul>
          </section>

          {/* Payment Terms */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Payment Terms</h2>
            <div className="space-y-3 text-gray-300">
              <p>
                All prices are displayed in British Pounds (GBP) and include applicable fees. We accept major credit and debit cards through our secure payment processor. Payment is processed immediately upon checkout, and you will receive a confirmation email with your booking details.
              </p>
              <p>
                <span className="font-semibold text-white">Failed Payments:</span> If your payment fails, your order will not be completed. You may attempt payment again without penalty.
              </p>
              <p>
                <span className="font-semibold text-white">Fraud Detection:</span> We reserve the right to cancel any order that appears fraudulent or suspicious and to investigate unauthorized payment claims.
              </p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h2>
            <p className="mb-3">
              TO THE FULLEST EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Banglafest shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from the use of the Platform or purchase of tickets</li>
              <li>We are not responsible for event cancellations, postponements, or relocations due to unforeseen circumstances</li>
              <li>Our total liability shall not exceed the ticket purchase price</li>
            </ul>
          </section>

          {/* Event Cancellation & Postponement */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Event Cancellation & Postponement</h2>
            <div className="space-y-3 text-gray-300">
              <p>
                In the event of cancellation or postponement due to circumstances beyond our control (including but not limited to weather, technical issues, security concerns, or government restrictions), we will:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Notify all ticket holders via email</li>
                <li>Offer a voucher redeemable for a future event of equal or greater value</li>
                <li>Provide alternative dates or events if available</li>
              </ul>
              <p className="pt-3 border-t border-gray-800">
                <span className="font-semibold text-white">Refunds will only be issued at the sole discretion of Banglafest</span>, and in most cases, event credit will be offered instead.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Intellectual Property Rights</h2>
            <p>
              All content on the Banglafest Platform, including text, graphics, logos, images, and software, is the property of Banglafest or its content suppliers and is protected by international copyright laws. You may not reproduce, distribute, or transmit any content without prior written permission.
            </p>
          </section>

          {/* Prohibited Activities */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Prohibited Activities</h2>
            <p className="mb-3">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Use the Platform for any fraudulent or illegal purpose</li>
              <li>Attempt to access restricted areas or bypass security measures</li>
              <li>Resell tickets at inflated prices or through unauthorized channels</li>
              <li>Create multiple accounts to circumvent purchase limits</li>
              <li>Harass, abuse, or threaten other users or staff members</li>
              <li>Scrape, crawl, or extract data from the Platform</li>
              <li>Interfere with or disrupt the Platform's functionality</li>
            </ul>
          </section>

          {/* Amendments to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Amendments to These Terms</h2>
            <p>
              Banglafest reserves the right to modify these Terms at any time without notice. Changes will be effective immediately upon posting to the Platform. Your continued use of the Platform following any modifications constitutes your acceptance of the updated Terms. We recommend reviewing these Terms periodically for changes.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contact & Support</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-3">
              <p>
                For questions, concerns, or to exercise your rights under these Terms, please contact us:
              </p>
              <div className="space-y-2 text-gray-300">
                <p><span className="font-semibold text-white">Email:</span> connect@ambrosianuk.com</p>
                <p><span className="font-semibold text-white">Company:</span> Ambrosian UK</p>
                <p><span className="font-semibold text-white">Platform:</span> Banglafest Ticketing System</p>
              </div>
            </div>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Governing Law & Jurisdiction</h2>
            <p>
              These Terms and Conditions are governed by the laws of England and Wales. Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts in England and Wales. Both parties agree to submit to such jurisdiction and waive any objections to venue or inconvenient forum.
            </p>
          </section>

          {/* Acknowledgment */}
          <section className="bg-primary-950 border border-primary-800 rounded-lg p-6 mt-12">
            <h3 className="text-lg font-bold text-white mb-3">Acknowledgment</h3>
            <p>
              By clicking "I Agree" during the checkout process, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions in their entirety, including our Privacy Policy. You also acknowledge that you are purchasing a non-refundable ticket and that you accept all risks associated with your attendance at the event.
            </p>
          </section>
        </div>

        {/* Back Button */}
        <div className="mt-12 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
