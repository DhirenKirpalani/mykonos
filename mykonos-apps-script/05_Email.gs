/**
 * MYKONOS Dubai — Email
 * Branded HTML email templates for booking invitations and confirmations.
 * All sends go through mykSendEmailWithRetry_ for resilience.
 */

// ---------------------------------------------------------------------------
// Shared HTML email shell
// ---------------------------------------------------------------------------

/**
 * Wraps content in the MYKONOS branded email shell.
 * @param {string} bodyContent  Inner HTML content (inside the white card).
 * @return {string}
 */
function mykEmailShell_(bodyContent) {
  return '<!DOCTYPE html>' +
  '<html lang="en"><head><meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>MYKONOS Dubai</title></head>' +
  '<body style="margin:0;padding:0;background:#0A1E3D;font-family:Arial,Helvetica,sans-serif;">' +

  // Outer wrapper
  '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A1E3D;padding:32px 0;">' +
  '<tr><td align="center">' +

  // Card
  '<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4);">' +

  // ── Header ──────────────────────────────────────────────────────────────
  // Note: Gmail strips SVG and CSS gradient-text. Use plain inline-color text instead.
  '<tr><td style="background:#071D49;padding:40px 48px 32px;text-align:center;">' +

  // MYKONOS wordmark — plain bold gold text, visible in all email clients incl. Gmail
  '<p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:48px;font-weight:bold;' +
  'letter-spacing:4px;color:#D9B25E;line-height:1;">MYKONOS</p>' +

  // Gold divider
  '<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 14px;">' +
  '<tr><td style="width:80px;height:1px;background:#B8985F;font-size:0;line-height:0;">&nbsp;</td></tr>' +
  '</table>' +

  // Sub-heading
  '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:3px;' +
  'color:rgba(255,255,255,0.55);text-transform:uppercase;">Dubai Exhibition &nbsp;&middot;&nbsp; October 3&ndash;10, 2026</p>' +
  '</td></tr>' +

  // ── Body ────────────────────────────────────────────────────────────────
  '<tr><td style="background:#FFFFFF;padding:40px 48px;">' +
  bodyContent +
  '</td></tr>' +

  // ── Footer ──────────────────────────────────────────────────────────────
  '<tr><td style="background:#041232;padding:24px 48px;text-align:center;">' +
  '<p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.4);letter-spacing:1px;">MYKONOS &nbsp;·&nbsp; manager@officialmykonos.com</p>' +
  '<p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);">Fairmont Hotel Dubai, Sheikh Zayed Road — The Summit Hall, Level 33</p>' +
  '</td></tr>' +

  '</table>' +
  '</td></tr></table>' +
  '</body></html>';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml_(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Gold CTA button */
function mykBtn_(href, label) {
  return '<table cellpadding="0" cellspacing="0" border="0" style="margin:28px auto;">' +
    '<tr><td style="border-radius:6px;background:linear-gradient(90deg,#B8985F 0%,#D9B25E 50%,#B8985F 100%);">' +
    '<a href="' + href + '" target="_blank" ' +
    'style="display:inline-block;padding:14px 40px;font-family:Arial,Helvetica,sans-serif;' +
    'font-size:15px;font-weight:bold;color:#071D49;text-decoration:none;letter-spacing:1px;">' +
    label + '</a></td></tr></table>';
}

/** Info row with bold label */
function mykInfoRow_(label, value) {
  return '<tr>' +
    '<td style="padding:6px 12px 6px 0;font-size:14px;color:#666;white-space:nowrap;vertical-align:top;">' + label + '</td>' +
    '<td style="padding:6px 0;font-size:14px;color:#1A1A1A;vertical-align:top;">' + value + '</td>' +
    '</tr>';
}

// ---------------------------------------------------------------------------
// Retry-aware sender
// ---------------------------------------------------------------------------

/**
 * Retries up to 3 times with exponential backoff.
 * @return {boolean} true if sent successfully.
 */
function mykSendEmailWithRetry_(params, label) {
  var maxAttempts = 3;
  var delays = [2000, 5000, 10000];
  for (var attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      MailApp.sendEmail(params);
      if (attempt > 1) mykLog(label + ' sent on retry attempt ' + attempt + '.');
      return true;
    } catch (err) {
      mykLog(label + ' send attempt ' + attempt + ' failed: ' + err.message);
      if (attempt < maxAttempts) Utilities.sleep(delays[attempt - 1]);
    }
  }
  mykLog(label + ' FAILED after ' + maxAttempts + ' attempts.');
  return false;
}

// ---------------------------------------------------------------------------
// Booking invitation email (sent on CEO approval)
// ---------------------------------------------------------------------------

/**
 * Send the new-buyer booking email.
 * @return {boolean} true if sent successfully.
 */
function sendNewBuyerBookingEmail(name, email) {
  if (!email) {
    mykLog('No email address provided. Cannot send booking email.');
    return false;
  }

  var bookingLink = MYK.BOOKING_LINK;
  if (!bookingLink || bookingLink.indexOf('PASTE_YOUR') === 0) {
    mykLog('WARNING: BOOKING_LINK not configured in Config.');
  }

  var subject = 'MYKONOS Dubai — Book your meeting';
  var safeName  = escapeHtml_(name || 'there');
  var safeLink  = escapeHtml_(bookingLink);
  var safeWA    = escapeHtml_(MYK.WHATSAPP_LINK);
  var safeWANum = escapeHtml_(MYK.WHATSAPP_NUMBER);

  var bodyContent =
    // Greeting
    '<p style="margin:0 0 20px;font-size:16px;color:#1A1A1A;">Dear ' + safeName + ',</p>' +

    '<p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">' +
    'Thank you for your interest in meeting the <strong>MYKONOS</strong> team during our Dubai exhibition. ' +
    'We would be delighted to meet with you and explore potential collaboration opportunities.</p>' +

    '<p style="margin:0 0 8px;font-size:15px;color:#333;">Please select a convenient <strong>' + escapeHtml_(MYK.MEETING_DURATION) + '</strong> meeting slot:</p>' +

    // CTA button
    mykBtn_(safeLink, 'Book Your Meeting &rarr;') +

    // Gold divider
    '<div style="border-top:1px solid #E8D5A3;margin:24px 0;"></div>' +

    // Info block
    '<table cellpadding="0" cellspacing="0" border="0" style="width:100%;">' +
    mykInfoRow_('&#128197; <strong>Event dates</strong>', escapeHtml_(MYK.EVENT_DATES)) +
    mykInfoRow_('&#128205; <strong>Location</strong>',
      escapeHtml_(MYK.LOCATION).replace(/\n/g, '<br>')) +
    mykInfoRow_('&#128694; <strong>Directions</strong>', escapeHtml_(MYK.DIRECTIONS)) +
    '</table>' +

    // Gold divider
    '<div style="border-top:1px solid #E8D5A3;margin:24px 0;"></div>' +

    '<p style="margin:0 0 6px;font-size:14px;color:#555;">Questions or need assistance?</p>' +
    '<p style="margin:0 0 24px;font-size:14px;color:#555;">' +
    '&#128172; WhatsApp: <a href="' + safeWA + '" style="color:#B8985F;font-weight:bold;">' + safeWANum + '</a></p>' +

    '<p style="margin:0 0 4px;font-size:15px;color:#333;">We look forward to meeting you in Dubai.</p>' +
    '<p style="margin:0;font-size:15px;color:#333;">Best regards,<br>' +
    '<strong style="color:#071D49;">MYKONOS Team</strong></p>';

  var htmlBody = mykEmailShell_(bodyContent);

  var plainBody =
    'Dear ' + (name || 'there') + ',\n\n' +
    'Thank you for your interest in meeting the MYKONOS team during our Dubai exhibition.\n\n' +
    'Please select a convenient ' + MYK.MEETING_DURATION + ' meeting slot:\n' +
    bookingLink + '\n\n' +
    'Event dates: ' + MYK.EVENT_DATES + '\n' +
    'Location: ' + MYK.LOCATION + '\n' +
    'Directions: ' + MYK.DIRECTIONS + '\n\n' +
    'WhatsApp: ' + MYK.WHATSAPP_LINK + '\n\n' +
    'Best regards,\nMYKONOS Team';

  return mykSendEmailWithRetry_(
    { to: email, subject: subject, body: plainBody, htmlBody: htmlBody },
    'Booking email'
  );
}

// ---------------------------------------------------------------------------
// Booking confirmation email (sent after buyer books a slot)
// ---------------------------------------------------------------------------

/**
 * Send a booking confirmation email to the buyer after they book a slot.
 * @param {string} name  Buyer name.
 * @param {string} email Buyer email.
 * @param {Date}   meetingTime  The meeting start time.
 * @return {boolean} true if sent successfully.
 */
function sendBookingConfirmationEmail(name, email, meetingTime) {
  if (!email) {
    mykLog('No email address provided. Cannot send confirmation email.');
    return false;
  }

  var formattedTime = mykFormatDate(meetingTime);
  var subject = 'MYKONOS Dubai — Your meeting is confirmed';
  var safeName    = escapeHtml_(name || 'there');
  var safeTime    = escapeHtml_(formattedTime);
  var safeWA      = escapeHtml_(MYK.WHATSAPP_LINK);
  var safeWANum   = escapeHtml_(MYK.WHATSAPP_NUMBER);

  var bodyContent =
    '<p style="margin:0 0 20px;font-size:16px;color:#1A1A1A;">Dear ' + safeName + ',</p>' +

    // Confirmed badge
    '<div style="background:#F0F8F0;border-left:4px solid #4CAF50;border-radius:4px;padding:14px 18px;margin:0 0 24px;">' +
    '<p style="margin:0;font-size:15px;color:#2E7D32;font-weight:bold;">&#10003;&nbsp; Your meeting is confirmed!</p>' +
    '</div>' +

    '<p style="margin:0 0 16px;font-size:15px;color:#333;line-height:1.6;">' +
    'We are looking forward to meeting with you at the <strong>MYKONOS Dubai Exhibition</strong>. ' +
    'Here are your meeting details:</p>' +

    // Gold divider
    '<div style="border-top:1px solid #E8D5A3;margin:20px 0;"></div>' +

    // Meeting details
    '<table cellpadding="0" cellspacing="0" border="0" style="width:100%;">' +
    mykInfoRow_('&#128197; <strong>Date &amp; time</strong>', safeTime + ' <span style="color:#888;">(Dubai / GMT+4)</span>') +
    mykInfoRow_('&#9200; <strong>Duration</strong>', escapeHtml_(MYK.MEETING_DURATION)) +
    mykInfoRow_('&#128205; <strong>Location</strong>',
      escapeHtml_(MYK.LOCATION).replace(/\n/g, '<br>')) +
    mykInfoRow_('&#128694; <strong>Directions</strong>', escapeHtml_(MYK.DIRECTIONS)) +
    '</table>' +

    // Gold divider
    '<div style="border-top:1px solid #E8D5A3;margin:24px 0;"></div>' +

    '<p style="margin:0 0 6px;font-size:14px;color:#555;">Need to reschedule or have questions?</p>' +
    '<p style="margin:0 0 24px;font-size:14px;color:#555;">' +
    '&#128172; WhatsApp: <a href="' + safeWA + '" style="color:#B8985F;font-weight:bold;">' + safeWANum + '</a></p>' +

    '<p style="margin:0 0 4px;font-size:15px;color:#333;">We look forward to meeting you in Dubai.</p>' +
    '<p style="margin:0;font-size:15px;color:#333;">Best regards,<br>' +
    '<strong style="color:#071D49;">MYKONOS Team</strong></p>';

  var htmlBody = mykEmailShell_(bodyContent);

  var plainBody =
    'Dear ' + (name || 'there') + ',\n\n' +
    'Your meeting with the MYKONOS team has been confirmed.\n\n' +
    'Date/time: ' + formattedTime + ' (Dubai / GMT+4)\n' +
    'Duration: ' + MYK.MEETING_DURATION + '\n' +
    'Location: ' + MYK.LOCATION + '\n' +
    'Directions: ' + MYK.DIRECTIONS + '\n\n' +
    'WhatsApp: ' + MYK.WHATSAPP_LINK + '\n\n' +
    'Best regards,\nMYKONOS Team';

  return mykSendEmailWithRetry_(
    { to: email, subject: subject, body: plainBody, htmlBody: htmlBody },
    'Confirmation email'
  );
}
