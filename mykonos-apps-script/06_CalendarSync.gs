/**
 * MYKONOS Dubai — Calendar Synchronization
 * Trigger 3: syncMykonosMeetings (time-based, every 1 minute).
 *
 * Detects new/changed/cancelled appointment events, extracts buyer info,
 * updates New Buyers / Existing Buyers, renames events, and updates the Dashboard.
 * Idempotent, duplicate-safe, reschedule-safe, and error-tolerant.
 */
function syncMykonosMeetings() {
  var lock = mykTryLock(5000);
  if (!lock) return;

  try {
    mykLog('Checking calendar events');

    var cal = CalendarApp.getCalendarById(MYK.CALENDAR_ID);
    if (!cal) {
      mykLog('Calendar not found: ' + MYK.CALENDAR_ID);
      mykReleaseLock(lock);
      return;
    }

    // Narrow scan window around the exhibition dates (not ±30 days from now).
    var win = getExhibitionScanWindow_();
    mykLog('Scan window: ' + mykFormatDate(win.start) + ' → ' + mykFormatDate(win.end));

    var events = cal.getEvents(win.start, win.end);
    mykLog('Found ' + events.length + ' events');

    // Watermark: only process events that were last updated since the last sync.
    var lastSync = mykGetLastSyncTime();
    var firstRun = !lastSync;
    mykLog('Last sync: ' + (lastSync ? mykFormatDate(lastSync) : '(none — first run)'));

    var nbSheet = mykGetSheet(MYK.NEW_BUYERS_SHEET);
    var ebSheet = mykGetSheet(MYK.EXISTING_BUYERS_SHEET);
    var nbHeaders = mykReadHeaders(nbSheet);
    var ebHeaders = mykReadHeaders(ebSheet);

    var processed = 0;
    var skipped = 0;
    for (var i = 0; i < events.length; i++) {
      var event = events[i];
      try {
        // Skip events that haven't changed since the last sync.
        // (Always process on the first run.)
        if (!firstRun) {
          var updated = safeGetLastUpdated_(event);
          if (updated && lastSync && updated.getTime() < lastSync.getTime()) {
            skipped++;
            continue;
          }
        }
        processCalendarEvent_(event, cal, nbSheet, nbHeaders, ebSheet, ebHeaders);
        processed++;
      } catch (err) {
        var evId = '';
        var evTitle = '';
        try { evId = event.getId(); } catch (e2) {}
        try { evTitle = event.getTitle(); } catch (e2) {}
        console.error('[SYNC] Error processing event ' + evId + ' "' + evTitle + '": ' + err.message);
      }
    }

    mykLog('Processed ' + processed + ' of ' + events.length + ' events (' + skipped + ' skipped as unchanged)');

    // Stamp the watermark for the next run.
    mykSetLastSyncTime(new Date());

    updateDashboard();
    mykLog('Completed successfully');
  } catch (err) {
    console.error('[SYNC] syncMykonosMeetings fatal error: ' + err.message);
  } finally {
    mykReleaseLock(lock);
  }
}

/**
 * Force a full re-sync of all events by clearing the watermark.
 * Run this from the Apps Script editor after updating the parser
 * to re-process events that were already synced with the old parser.
 */
function forceFullResync() {
  mykLog('=== Forcing full re-sync (clearing watermark) ===');
  mykStateSet('lastSyncTime', '');
  syncMykonosMeetings();
}

/**
 * DEBUG: Dump raw calendar event data to the execution log.
 * Run this from the Apps Script editor to see exactly what
 * the calendar event contains (description, guests, title, etc.)
 * so we can fix the field parser.
 */
function debugDumpEvents() {
  var cal = CalendarApp.getCalendarById(MYK.CALENDAR_ID);
  var win = getExhibitionScanWindow_();
  var events = cal.getEvents(win.start, win.end);
  mykLog('Found ' + events.length + ' events');

  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    var id = safeGetId_(event);
    var title = safeGetTitle_(event);
    var desc = safeGetDescription_(event);
    var status = safeGetStatus_(event);

    mykLog('--- EVENT ' + (i + 1) + ' ---');
    mykLog('ID: ' + id);
    mykLog('Title: ' + title);
    mykLog('Status: ' + status);
    mykLog('Start: ' + safeGetStartTime_(event));
    mykLog('Description:\n' + desc);

    // Guests
    try {
      var guests = event.getGuestList();
      for (var g = 0; g < guests.length; g++) {
        mykLog('Guest ' + (g + 1) + ': ' + guests[g].getName() + ' <' + guests[g].getEmail() + '>');
      }
    } catch (e) {
      mykLog('Guests: (error) ' + e.message);
    }

    // Advanced service (if enabled)
    try {
      var raw = Calendar.Events.get(MYK.CALENDAR_ID, id);
      mykLog('Advanced description: ' + (raw.description || '(none)'));
      mykLog('ExtendedProperties: ' + JSON.stringify(raw.extendedProperties || {}));
      mykLog('Attendees: ' + JSON.stringify(raw.attendees || []));
    } catch (e) {
      mykLog('Advanced: ' + e.message);
    }
    mykLog('--- END EVENT ---');
  }
}

/**
 * Build the calendar scan window from the exhibition date bounds
 * plus a small padding, instead of ±30 days from "now".
 */
function getExhibitionScanWindow_() {
  var padMs = MYK.SYNC_DAYS_BEFORE * 24 * 60 * 60 * 1000;
  var padAfterMs = MYK.SYNC_DAYS_AFTER * 24 * 60 * 60 * 1000;
  var start = new Date(MYK.EXHIBITION_START + 'T00:00:00');
  var end = new Date(MYK.EXHIBITION_END + 'T23:59:59');
  // Guard against invalid dates.
  if (isNaN(start.getTime())) start = new Date(Date.now() - padMs);
  if (isNaN(end.getTime())) end = new Date(Date.now() + padAfterMs);
  return {
    start: new Date(start.getTime() - padMs),
    end: new Date(end.getTime() + padAfterMs)
  };
}

/**
 * Process a single calendar event.
 * Decides whether it's a New Buyer or Existing Buyer and updates the right sheet.
 */
function processCalendarEvent_(event, cal, nbSheet, nbHeaders, ebSheet, ebHeaders) {
  var eventId = safeGetId_(event);
  var status = safeGetStatus_(event); // CalendarApp.EventStatus
  var title = safeGetTitle_(event);
  var startTime = safeGetStartTime_(event);
  var endTime = safeGetEndTime_(event);

  mykLog('Processing event: ' + eventId);

  // Determine cancellation. CalendarApp exposes getStatus() returning
  // CalendarApp.Status.CANCELED for cancelled events.
  var isCancelled = (status === 'CANCELED' || status === 'CANCELLED' || status === 'cancelled');

  // Extract buyer information from the event.
  var info = extractBuyerInfo_(event, cal);
  var email = info.email;
  mykLog('Buyer email: ' + (email || '(none)'));

  // --- Cancellation handling ---
  if (isCancelled) {
    mykLog('Event ' + eventId + ' is cancelled.');
    handleCancellation_(eventId, email, nbSheet, nbHeaders, ebSheet, ebHeaders, startTime);
    return;
  }

  // Skip events that are clearly not MYKONOS buyer meetings and have no buyer email.
  // We treat any event with an attendee email as a potential buyer meeting.
  if (!email) {
    // Could be an unrelated personal event. Ignore unless it looks like a MYKONOS meeting.
    if (title && title.indexOf('MYKONOS') !== -1) {
      mykLog('MYKONOS event without buyer email: ' + eventId + ' — updating title/description only.');
    } else {
      mykLog('Unrelated event ignored: ' + eventId + ' "' + title + '"');
    }
    return;
  }

  // --- Identify buyer type ---
  // Priority 1: email exists in New Buyers.
  var nbRow = mykFindRow(nbSheet, nbHeaders, 'Email address', email, { email: true });
  if (nbRow !== -1) {
    mykLog('Buyer type: New Buyer (row ' + nbRow + ')');
    updateNewBuyerFromEvent_(nbSheet, nbHeaders, nbRow, event, info, eventId, startTime);
    updateEventMetadata_(event, info, 'New Buyer');
    return;
  }

  // Priority 2/3: Existing Buyers (match by Event ID first for reschedule/rebook).
  mykLog('Buyer type: Existing Buyer');
  updateExistingBuyerFromEvent_(ebSheet, ebHeaders, event, info, eventId, startTime);
  updateEventMetadata_(event, info, 'Existing Buyer');
}

// ============================================================
// Buyer info extraction
// ============================================================

/**
 * Extract buyer info from a calendar event.
 * Tries multiple sources: attendees, event title, description, and
 * the Calendar Advanced Service (if enabled) for custom booking fields.
 *
 * Per the spec, we do NOT assume a fixed format. We parse whatever is available.
 */
function extractBuyerInfo_(event, cal) {
  var info = {
    firstName: '',
    lastName: '',
    name: '',
    email: '',
    company: '',
    whatsapp: '',
    country: '',
    purpose: '',
    startTime: safeGetStartTime_(event),
    endTime: safeGetEndTime_(event),
    createdTime: safeGetCreatedTime_(event)
  };

  // 1) Attendees — primary source for name + email.
  try {
    var guests = event.getGuestList();
    for (var i = 0; i < guests.length; i++) {
      var g = guests[i];
      var gEmail = mykStr(g.getEmail());
      if (gEmail && !info.email) {
        info.email = gEmail;
        var gName = mykStr(g.getName());
        if (gName) {
          info.name = gName;
          var parts = gName.split(/\s+/);
          info.firstName = parts[0] || '';
          info.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
        }
      }
    }
  } catch (e) { /* ignore */ }

  // 2) Description — parse structured key:value lines if present.
  var description = safeGetDescription_(event);
  var parsed = parseDescriptionFields_(description);
  info.company = info.company || parsed['Company'] || parsed['Company Name'] || parsed['Company name'] || '';
  info.whatsapp = info.whatsapp || parsed['WhatsApp'] || parsed['WhatsApp Number'] || parsed['WhatsApp number'] || '';
  info.country = info.country || parsed['Country'] || '';
  info.purpose = info.purpose || parsed['Meeting Purpose'] || parsed['Meeting purpose'] || parsed['Purpose'] || '';
  info.email = info.email || parsed['Email'] || parsed['Email Address'] || parsed['Email address'] || '';
  // Appointment Schedule uses "First name" and "Surname" separately — merge them.
  if (!info.name) {
    var firstName = parsed['First name'] || parsed['First Name'] || '';
    var surname = parsed['Surname'] || parsed['Last name'] || parsed['Last Name'] || '';
    if (firstName || surname) {
      info.name = mykStr(firstName + ' ' + surname).trim();
      info.firstName = firstName;
      info.lastName = surname;
    } else {
      info.name = parsed['Buyer'] || parsed['Name'] || '';
      if (info.name) {
        var parts = info.name.split(/\s+/);
        info.firstName = parts[0] || '';
        info.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
      }
    }
  }

  // 3) Title — sometimes Google Appointment Schedule puts the booker's name in the title.
  var title = safeGetTitle_(event);
  if (!info.name && title) {
    // e.g. "30 Minute Meeting - John Smith" or "John Smith"
    var cleaned = title.replace(/^MYKONOS\s*[×x]\s*/i, '').replace(/^\d+\s*Minute\s*Meeting\s*[-:]\s*/i, '');
    if (cleaned && cleaned !== title) {
      info.name = cleaned.trim();
      var parts = info.name.split(/\s+/);
      info.firstName = parts[0] || '';
      info.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    }
    // Google Appointment Schedule format: "Event Title (Booker Name)"
    // e.g. "MYKONOS Dubai Exhibition Buyer Meeting (Dhiren Kirpalani)"
    if (!info.name) {
      var parenMatch = title.match(/\(([^)]+)\)\s*$/);
      if (parenMatch) {
        info.name = parenMatch[1].trim();
        var parts2 = info.name.split(/\s+/);
        info.firstName = parts2[0] || '';
        info.lastName = parts2.length > 1 ? parts2.slice(1).join(' ') : '';
      }
    }
  }

  // 4) Calendar Advanced Service — try to read custom booking fields / extended properties.
  //    This is optional; we handle 404 and missing-service errors gracefully.
  var advanced = tryGetAdvancedEvent_(cal, safeGetId_(event));
  if (advanced) {
    mergeAdvancedInfo_(info, advanced);
  }

  // Build full name from first+last if needed.
  if (!info.name && (info.firstName || info.lastName)) {
    info.name = mykStr(info.firstName + ' ' + info.lastName);
  }

  return info;
}

/**
 * Parse a description block for "Key: value" lines.
 * Handles three formats:
 *   1) "Key: value" on the same line
 *   2) "Key" on one line, "value" on the next line (plain text)
 *   3) HTML format: "<b>Key</b>\nvalue<br><b>Key2</b>\nvalue2" (Google Appointment Schedule)
 */
function parseDescriptionFields_(description) {
  var out = {};
  if (!description) return out;

  // Known field labels (lowercase) that we look for.
  var knownLabels = {
    'company name': 'Company name',
    'company': 'Company name',
    'whatsapp number': 'WhatsApp number',
    'whatsapp': 'WhatsApp number',
    'country': 'Country',
    'meeting purpose': 'Meeting purpose',
    'purpose': 'Meeting purpose',
    'first name': 'First name',
    'surname': 'Surname',
    'last name': 'Surname',
    'email address': 'Email address',
    'email': 'Email address',
    'name': 'Name',
    'booked by': 'Name'
  };

  // Strip HTML tags but keep the text content and line breaks.
  // <br> → newline, <p>...</p> → newlines, <b>...</b> → just the text.
  var cleaned = description
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')        // strip all remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'");

  var lines = cleaned.split(/\r?\n/);

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();
    if (!trimmed) continue;

    // Format 1: "Key: value" on the same line.
    var m = trimmed.match(/^([A-Za-z][A-Za-z0-9 _\/-]*?)\s*:\s*(.+?)\s*$/);
    if (m) {
      var key1 = m[1].trim().toLowerCase();
      var val1 = m[2].trim();
      var mappedKey1 = knownLabels[key1] || capitalizeWords_(key1);
      out[mappedKey1] = val1;
      continue;
    }

    // Format 2 & 3: "Key" on this line, "value" on the next non-empty line.
    var keyLower = trimmed.toLowerCase();
    if (knownLabels[keyLower] && i + 1 < lines.length) {
      // Find the next non-empty line as the value.
      for (var j = i + 1; j < lines.length; j++) {
        var nextLine = lines[j].trim();
        if (nextLine) {
          // Skip if the next line is itself a known label (value is missing).
          if (knownLabels[nextLine.toLowerCase()]) break;
          out[knownLabels[keyLower]] = nextLine;
          i = j; // advance past the value line
          break;
        }
      }
    }
  }
  return out;
}

function capitalizeWords_(s) {
  if (!s) return s;
  return s.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

/**
 * Try the Calendar Advanced Service to fetch the raw event.
 * Returns null if the service is unavailable or the event is not found (404).
 */
function tryGetAdvancedEvent_(cal, eventId) {
  if (!eventId) return null;
  try {
    // Calendar Advanced Service (must be enabled in the script project).
    var raw = Calendar.Events.get(MYK.CALENDAR_ID, eventId);
    return raw;
  } catch (e) {
    // Gracefully handle 404 / service not enabled.
    var msg = e.message || '';
    if (msg.indexOf('Not Found') !== -1 || msg.indexOf('404') !== -1) {
      // Expected for some appointment contexts — not an error.
      return null;
    }
    if (msg.indexOf('is not defined') !== -1 || msg.indexOf('Calendar.Events') !== -1) {
      // Advanced service not enabled. That's fine — we proceed with CalendarApp data.
      return null;
    }
    mykLog('Advanced event lookup error (non-fatal): ' + msg);
    return null;
  }
}

/**
 * Merge fields from the advanced (raw) event into `info` when missing.
 * Google Appointment Schedule stores custom fields in different places
 * depending on configuration. We check the most common ones.
 */
function mergeAdvancedInfo_(info, raw) {
  if (!raw) return;

  // Extended properties (private/shared).
  try {
    var ext = raw.extendedProperties || {};
    var props = {};
    if (ext.private) for (var k in ext.private) props[k.toLowerCase()] = ext.private[k];
    if (ext.shared) for (var k2 in ext.shared) props[k2.toLowerCase()] = ext.shared[k2];
    info.company = info.company || pickProp_(props, ['company', 'companyname', 'company name']);
    info.whatsapp = info.whatsapp || pickProp_(props, ['whatsapp', 'whatsappnumber', 'whatsapp number', 'phone', 'phonenumber']);
    info.country = info.country || pickProp_(props, ['country']);
    info.purpose = info.purpose || pickProp_(props, ['purpose', 'meetingpurpose', 'meeting purpose']);
  } catch (e) { /* ignore */ }

  // Conference data / description (already parsed) — also check raw.description.
  try {
    if (raw.description && !info.company && !info.whatsapp && !info.country && !info.purpose) {
      var parsed = parseDescriptionFields_(raw.description);
      info.company = info.company || parsed['Company'] || parsed['Company Name'] || parsed['Company name'] || '';
      info.whatsapp = info.whatsapp || parsed['WhatsApp'] || parsed['WhatsApp Number'] || parsed['WhatsApp number'] || '';
      info.country = info.country || parsed['Country'] || '';
      info.purpose = info.purpose || parsed['Meeting Purpose'] || parsed['Meeting purpose'] || parsed['Purpose'] || '';
      if (!info.name) {
        var firstName = parsed['First name'] || parsed['First Name'] || '';
        var surname = parsed['Surname'] || parsed['Last name'] || '';
        if (firstName || surname) {
          info.name = mykStr(firstName + ' ' + surname).trim();
        }
      }
    }
  } catch (e) { /* ignore */ }

  // Attendees raw (sometimes includes additional guest details).
  try {
    if (raw.attendees && raw.attendees.length && !info.email) {
      for (var i = 0; i < raw.attendees.length; i++) {
        var a = raw.attendees[i];
        if (a.email && a.self !== true) {
          info.email = a.email;
          if (a.displayName && !info.name) {
            info.name = a.displayName;
            var parts = a.displayName.split(/\s+/);
            info.firstName = parts[0] || '';
            info.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
          }
          break;
        }
      }
    }
  } catch (e) { /* ignore */ }

  // Created time.
  try {
    if (raw.created && !info.createdTime) {
      info.createdTime = new Date(raw.created);
    }
  } catch (e) { /* ignore */ }
}

function pickProp_(props, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (props[keys[i]]) return props[keys[i]];
  }
  return '';
}

// ============================================================
// New Buyer update from event
// ============================================================

function updateNewBuyerFromEvent_(nbSheet, nbHeaders, rowNumber, event, info, eventId, startTime) {
  // Dedupe by Event ID: if this row already has this Event ID, just refresh times.
  var existingEventId = mykGetCellByHeader(nbSheet, nbHeaders, rowNumber, 'Event ID');
  var wasAlreadyBooked = (mykGetCellByHeader(nbSheet, nbHeaders, rowNumber, 'Booking Status') === 'Booked');
  var previousTimeStr = mykGetCellByHeader(nbSheet, nbHeaders, rowNumber, 'Meeting Date/Time');

  if (existingEventId && existingEventId === eventId) {
    mykLog('New Buyers row ' + rowNumber + ' already linked to event ' + eventId + '. Refreshing times.');
    mykSetCellByHeader(nbSheet, nbHeaders, rowNumber, 'Meeting Date/Time', mykFormatDate(startTime));
    mykSetCellByHeader(nbSheet, nbHeaders, rowNumber, 'Booking Status', 'Booked');
    // If the meeting time changed, re-send the confirmation email.
    var sheetNameReschedule = mykGetCellByHeader(nbSheet, nbHeaders, rowNumber, 'Name');
    maybeResendConfirmation_(nbSheet, nbHeaders, rowNumber, previousTimeStr, startTime, sheetNameReschedule || info.name, info.email);
    return;
  }

  mykSetCellByHeader(nbSheet, nbHeaders, rowNumber, 'Booking Status', 'Booked');
  mykSetCellByHeader(nbSheet, nbHeaders, rowNumber, 'Meeting Date/Time', mykFormatDate(startTime));
  mykSetCellByHeader(nbSheet, nbHeaders, rowNumber, 'Booking Timestamp', mykFormatDate(info.createdTime || new Date()));
  mykSetCellByHeader(nbSheet, nbHeaders, rowNumber, 'Event ID', eventId);

  // Fill any blank buyer fields from the event (data priority: don't overwrite existing data).
  fillIfBlank_(nbSheet, nbHeaders, rowNumber, 'Company name', info.company);
  fillIfBlank_(nbSheet, nbHeaders, rowNumber, 'WhatsApp number', info.whatsapp);
  fillIfBlank_(nbSheet, nbHeaders, rowNumber, 'Country', info.country);
  fillIfBlank_(nbSheet, nbHeaders, rowNumber, 'What would you like to collaborate on?', info.purpose);

  // Send a booking confirmation email (only once per booking).
  if (!wasAlreadyBooked) {
    // For New Buyers, prefer the name from the sheet (from the Google Form),
    // falling back to the calendar-parsed name.
    var sheetName = mykGetCellByHeader(nbSheet, nbHeaders, rowNumber, 'Name');
    var confirmName = sheetName || info.name || '';
    sendConfirmationIfNotSent_(nbSheet, nbHeaders, rowNumber, confirmName, info.email, startTime);
  }

  mykLog('Updated New Buyers row ' + rowNumber + ' — Booking Status=Booked');
}

/**
 * If the meeting time changed (reschedule), reset the Confirmation Sent flag
 * and send a new confirmation email.
 */
function maybeResendConfirmation_(sheet, headers, rowNumber, previousTimeStr, newStartTime, name, email) {
  if (!previousTimeStr) return;
  var newTimeStr = mykFormatDate(newStartTime);
  if (previousTimeStr === newTimeStr) return; // no change
  mykLog('Meeting time changed from "' + previousTimeStr + '" to "' + newTimeStr + '" — resending confirmation.');
  mykSetCellByHeader(sheet, headers, rowNumber, 'Confirmation Sent', '');
  sendConfirmationIfNotSent_(sheet, headers, rowNumber, name, email, newStartTime);
}

function fillIfBlank_(sheet, headers, rowNumber, header, value) {
  if (!value) return;
  var current = mykGetCellByHeader(sheet, headers, rowNumber, header);
  if (!current) {
    mykSetCellByHeader(sheet, headers, rowNumber, header, value);
  }
}

/**
 * Send a booking confirmation email to the buyer, but only once.
 * Uses the 'Confirmation Sent' column as a guard.
 */
function sendConfirmationIfNotSent_(sheet, headers, rowNumber, name, email, meetingTime) {
  // Guard: skip if the column doesn't exist or is already 'Yes'.
  var alreadySent = mykGetCellByHeader(sheet, headers, rowNumber, 'Confirmation Sent');
  if (alreadySent === 'Yes') return;

  if (!email) {
    mykLog('No buyer email — skipping confirmation email for row ' + rowNumber);
    return;
  }

  var sent = sendBookingConfirmationEmail(name, email, meetingTime);
  if (sent) {
    mykSetCellByHeader(sheet, headers, rowNumber, 'Confirmation Sent', 'Yes');
    mykLog('Confirmation email sent to ' + name + ' <' + email + '>');
  } else {
    mykSetCellByHeader(sheet, headers, rowNumber, 'Confirmation Sent', 'Failed');
    mykLog('Confirmation email FAILED for ' + name + ' <' + email + '>');
  }
}

// ============================================================
// Existing Buyer update from event
// ============================================================

function updateExistingBuyerFromEvent_(ebSheet, ebHeaders, event, info, eventId, startTime) {
  // Match 1: Event ID (handles reschedule + rebook).
  var rowByEvent = mykFindRow(ebSheet, ebHeaders, 'Event ID', eventId);

  // Match 2: Email + Meeting Date/Time (fallback if Event ID changed/unavailable).
  var rowByEmailTime = -1;
  if (rowByEvent === -1 && info.email) {
    rowByEmailTime = findExistingBuyerByEmailAndTime_(ebSheet, ebHeaders, info.email, startTime);
  }

  var rowNumber = rowByEvent !== -1 ? rowByEvent : rowByEmailTime;
  var isNewRow = (rowNumber === -1);

  // Capture the previous meeting time (for reschedule detection).
  var previousTimeStr = '';
  if (!isNewRow) {
    previousTimeStr = mykGetCellByHeader(ebSheet, ebHeaders, rowNumber, 'Meeting Date/Time');
  }

  if (isNewRow) {
    rowNumber = ebSheet.getLastRow() + 1;
    var newRow = [];
    for (var c = 0; c < ebHeaders.length; c++) newRow.push('');
    ebSheet.getRange(rowNumber, 1, 1, ebHeaders.length).setValues([newRow]);
    mykLog('Created Existing Buyers row: ' + rowNumber);
  } else {
    mykLog('Updated Existing Buyers row: ' + rowNumber);
  }

  // Booking date = when the booking was made (created time) or now.
  var bookingDate = info.createdTime || new Date();

  // Set fields. For existing rows, only overwrite with non-empty values (data priority).
  setIfNewOrNonEmpty_(ebSheet, ebHeaders, rowNumber, 'Timestamp', mykFormatDate(bookingDate), isNewRow);
  setIfNewOrNonEmpty_(ebSheet, ebHeaders, rowNumber, 'Name', info.name, isNewRow);
  setIfNewOrNonEmpty_(ebSheet, ebHeaders, rowNumber, 'Email address', info.email, isNewRow);
  setIfNewOrNonEmpty_(ebSheet, ebHeaders, rowNumber, 'Company name', info.company, isNewRow);
  setIfNewOrNonEmpty_(ebSheet, ebHeaders, rowNumber, 'WhatsApp number', info.whatsapp, isNewRow);
  setIfNewOrNonEmpty_(ebSheet, ebHeaders, rowNumber, 'Country', info.country, isNewRow);
  setIfNewOrNonEmpty_(ebSheet, ebHeaders, rowNumber, 'Meeting purpose', info.purpose, isNewRow);
  setIfNewOrNonEmpty_(ebSheet, ebHeaders, rowNumber, 'Meeting Date/Time', mykFormatDate(startTime), isNewRow);
  setIfNewOrNonEmpty_(ebSheet, ebHeaders, rowNumber, 'Booking Status', 'Booked', isNewRow);
  setIfNewOrNonEmpty_(ebSheet, ebHeaders, rowNumber, 'Event ID', eventId, isNewRow);
  setIfNewOrNonEmpty_(ebSheet, ebHeaders, rowNumber, 'Booking Timestamp', mykFormatDate(bookingDate), isNewRow);

  // Send a booking confirmation email (only once per booking).
  if (isNewRow) {
    var ebSheetName = mykGetCellByHeader(ebSheet, ebHeaders, rowNumber, 'Name');
    sendConfirmationIfNotSent_(ebSheet, ebHeaders, rowNumber, ebSheetName || info.name, info.email, startTime);
  } else {
    // Reschedule: if the meeting time changed, re-send the confirmation.
    var ebSheetName2 = mykGetCellByHeader(ebSheet, ebHeaders, rowNumber, 'Name');
    maybeResendConfirmation_(ebSheet, ebHeaders, rowNumber, previousTimeStr, startTime, ebSheetName2 || info.name, info.email);
  }
}

function setIfNewOrNonEmpty_(sheet, headers, rowNumber, header, value, isNewRow) {
  if (isNewRow) {
    mykSetCellByHeader(sheet, headers, rowNumber, header, value);
    return;
  }
  // Existing row: only overwrite when we have a non-empty new value.
  if (value !== '' && value !== null && value !== undefined) {
    mykSetCellByHeader(sheet, headers, rowNumber, header, value);
  }
}

function findExistingBuyerByEmailAndTime_(ebSheet, ebHeaders, email, startTime) {
  return findRowByEmailAndTime_(ebSheet, ebHeaders, 'Email address', 'Meeting Date/Time', email, startTime);
}

/**
 * Generic, timezone-safe search for a row matching a given email + meeting time.
 * Compares Date epoch values (not formatted strings) so manually-edited cells
 * or differing display formats don't break matching.
 * @return {number} 1-based row number, or -1 if not found.
 */
function findRowByEmailAndTime_(sheet, headers, emailHeader, timeHeader, email, startTime) {
  if (!email || !startTime) return -1;
  var emailCol = headers.indexOf(emailHeader);
  var timeCol = headers.indexOf(timeHeader);
  if (emailCol === -1 || timeCol === -1) return -1;
  var normEmail = mykNormalizeEmail(email);
  var startEpoch = (startTime instanceof Date) ? startTime.getTime() : 0;
  if (!startEpoch) return -1;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var rowEmail = mykNormalizeEmail(data[i][emailCol]);
    if (rowEmail !== normEmail || rowEmail === '') continue;
    var cellVal = data[i][timeCol];
    // cellVal may be a Date object or a string. Normalize to epoch.
    var cellEpoch = 0;
    if (cellVal instanceof Date) {
      cellEpoch = cellVal.getTime();
    } else if (cellVal) {
      var parsed = new Date(cellVal);
      if (!isNaN(parsed.getTime())) cellEpoch = parsed.getTime();
    }
    // Compare with a 1-minute tolerance to absorb rounding/format drift.
    if (cellEpoch && Math.abs(cellEpoch - startEpoch) < 60000) {
      return i + 1;
    }
  }
  return -1;
}

// ============================================================
// Cancellation handling
// ============================================================

function handleCancellation_(eventId, email, nbSheet, nbHeaders, ebSheet, ebHeaders, startTime) {
  var updated = false;

  // New Buyers by Event ID.
  if (eventId) {
    var nbRow = mykFindRow(nbSheet, nbHeaders, 'Event ID', eventId);
    if (nbRow !== -1) {
      mykSetCellByHeader(nbSheet, nbHeaders, nbRow, 'Booking Status', 'Cancelled');
      mykLog('New Buyers row ' + nbRow + ' marked Cancelled.');
      updated = true;
    }
  }

  // Existing Buyers by Event ID.
  if (eventId) {
    var ebRow = mykFindRow(ebSheet, ebHeaders, 'Event ID', eventId);
    if (ebRow !== -1) {
      mykSetCellByHeader(ebSheet, ebHeaders, ebRow, 'Booking Status', 'Cancelled');
      mykLog('Existing Buyers row ' + ebRow + ' marked Cancelled.');
      updated = true;
    }
  }

  // Fallback by email + time if Event ID didn't match (e.g. Google regenerated the ID).
  if (!updated && email && startTime) {
    // Try New Buyers by email + Meeting Date/Time.
    var nbRowByTime = findRowByEmailAndTime_(nbSheet, nbHeaders, 'Email address', 'Meeting Date/Time', email, startTime);
    if (nbRowByTime !== -1) {
      mykSetCellByHeader(nbSheet, nbHeaders, nbRowByTime, 'Booking Status', 'Cancelled');
      mykLog('New Buyers row ' + nbRowByTime + ' marked Cancelled (matched by email+time).');
      updated = true;
    }
    // Try Existing Buyers by email + Meeting Date/Time.
    var ebRowByTime = findRowByEmailAndTime_(ebSheet, ebHeaders, 'Email address', 'Meeting Date/Time', email, startTime);
    if (ebRowByTime !== -1) {
      mykSetCellByHeader(ebSheet, ebHeaders, ebRowByTime, 'Booking Status', 'Cancelled');
      mykLog('Existing Buyers row ' + ebRowByTime + ' marked Cancelled (matched by email+time).');
      updated = true;
    }
  }

  if (!updated) {
    mykLog('Cancellation could not be matched to any buyer row.');
  }
}

// ============================================================
// Event title + description enrichment
// ============================================================

function updateEventMetadata_(event, info, buyerType) {
  // Build the new title.
  var company = mykStr(info.company);
  var name = mykStr(info.name);
  var newTitle;
  if (company && name) {
    newTitle = 'MYKONOS × ' + company + ' — ' + name;
  } else if (company) {
    newTitle = 'MYKONOS × ' + company;
  } else if (name) {
    newTitle = 'MYKONOS — ' + name;
  } else {
    newTitle = 'MYKONOS Dubai — Buyer Meeting';
  }

  try {
    var currentTitle = safeGetTitle_(event);
    if (currentTitle !== newTitle) {
      event.setTitle(newTitle);
      mykLog('Renamed event to: ' + newTitle);
    }
  } catch (e) {
    mykLog('Could not rename event: ' + e.message);
  }

  // Only update the description if we actually have the custom field values.
  // This prevents overwriting Google Appointment Schedule's original description
  // (which contains the custom fields) with empty values before they can be parsed.
  var hasCustomFields = mykStr(info.company) || mykStr(info.whatsapp) ||
                        mykStr(info.country) || mykStr(info.purpose);
  if (!hasCustomFields) {
    mykLog('Skipping description update — custom fields not yet extracted (preserving original).');
    return;
  }

  // Build the structured description.
  var desc =
    'MYKONOS Dubai Buyer Meeting\n' +
    'Buyer Type: ' + buyerType + '\n' +
    'Buyer: ' + name + '\n' +
    'Email: ' + info.email + '\n' +
    'Company: ' + company + '\n' +
    'WhatsApp: ' + info.whatsapp + '\n' +
    'Country: ' + info.country + '\n' +
    'Meeting purpose: ' + info.purpose + '\n' +
    'Meeting location:\n' + MYK.LOCATION + '\n' +
    'Directions:\n' + MYK.DIRECTIONS + '\n' +
    'MYKONOS WhatsApp:\n' + MYK.WHATSAPP_LINK;

  try {
    var currentDesc = safeGetDescription_(event);
    // Only update if meaningfully different (avoid infinite edit loops).
    if (currentDesc !== desc) {
      event.setDescription(desc);
    }
  } catch (e) {
    mykLog('Could not update event description: ' + e.message);
  }
}

// ============================================================
// Safe CalendarApp accessors (never throw)
// ============================================================

function safeGetId_(event) {
  try { return event.getId(); } catch (e) { return ''; }
}
function safeGetTitle_(event) {
  try { return event.getTitle(); } catch (e) { return ''; }
}
function safeGetDescription_(event) {
  try { return event.getDescription(); } catch (e) { return ''; }
}
function safeGetStartTime_(event) {
  try { return event.getStartTime(); } catch (e) { return null; }
}
function safeGetEndTime_(event) {
  try { return event.getEndTime(); } catch (e) { return null; }
}
function safeGetStatus_(event) {
  try { return event.getStatus(); } catch (e) { return ''; }
}
function safeGetLastUpdated_(event) {
  // CalendarApp.CalendarEvent exposes getLastUpdated().
  try { return event.getLastUpdated(); } catch (e) { return null; }
}
function safeGetCreatedTime_(event) {
  // Prefer getLastUpdated() as a proxy when getDateCreated is unavailable.
  try {
    if (typeof event.getDateCreated === 'function') return event.getDateCreated();
  } catch (e) {}
  try { return event.getLastUpdated(); } catch (e) {}
  return null;
}
