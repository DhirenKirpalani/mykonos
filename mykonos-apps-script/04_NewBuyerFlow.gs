/**
 * MYKONOS Dubai — New Buyer Flow
 * Trigger 1: onNewBuyerFormSubmit  — initialize a new buyer record.
 * Trigger 2: onBuyerStatusEdit     — detect CEO approval/rejection and send email.
 */

/**
 * Trigger 1 — Google Form submission.
 * Creates/normalizes a New Buyers row with initial status values.
 * Uses e.namedValues (form field titles) with alias mapping for robust matching.
 */
function onNewBuyerFormSubmit(e) {
  mykLog('=== New buyer form submission received ===');
  try {
    var sheet = mykGetSheet(MYK.NEW_BUYERS_SHEET);
    var headers = mykReadHeaders(sheet);
    var rowNumber = sheet.getLastRow();

    // Prefer e.namedValues from the form event for accurate field mapping.
    // This is robust to form fields being named differently from our headers.
    if (e && e.namedValues) {
      var mapped = mapFormFields_(e.namedValues);
      for (var header in mapped) {
        if (headers.indexOf(header) !== -1) {
          mykSetCellByHeader(sheet, headers, rowNumber, header, mapped[header]);
        }
      }
    }

    // Initialize the workflow columns explicitly.
    mykSetCellByHeader(sheet, headers, rowNumber, 'Status', 'Pending');
    mykSetCellByHeader(sheet, headers, rowNumber, 'Approval Date', '');
    mykSetCellByHeader(sheet, headers, rowNumber, 'Email Sent', 'No');
    mykSetCellByHeader(sheet, headers, rowNumber, 'Booking Status', 'Not Booked');
    mykSetCellByHeader(sheet, headers, rowNumber, 'Meeting Date/Time', '');
    mykSetCellByHeader(sheet, headers, rowNumber, 'Booking Timestamp', '');
    mykSetCellByHeader(sheet, headers, rowNumber, 'Event ID', '');
    mykSetCellByHeader(sheet, headers, rowNumber, 'Confirmation Sent', '');

    var name = mykGetCellByHeader(sheet, headers, rowNumber, 'Name');
    var email = mykGetCellByHeader(sheet, headers, rowNumber, 'Email address');
    mykLog('New buyer registered: ' + name + ' <' + email + '> — Status=Pending');

    updateDashboard();
  } catch (err) {
    console.error('[SYNC] onNewBuyerFormSubmit error: ' + err.message);
  }
}

/**
 * Map Google Form namedValues (keyed by form field title) to our internal
 * header names using FORM_FIELD_ALIASES. Returns { header: value }.
 */
function mapFormFields_(namedValues) {
  var out = {};
  for (var formTitle in namedValues) {
    var val = namedValues[formTitle];
    if (Array.isArray(val)) val = val.length ? val[0] : '';
    val = mykStr(val);
    // Find which internal header this form field maps to.
    for (var header in FORM_FIELD_ALIASES) {
      var aliases = FORM_FIELD_ALIASES[header];
      for (var i = 0; i < aliases.length; i++) {
        if (formTitle.trim().toLowerCase() === aliases[i].toLowerCase()) {
          out[header] = val;
          break;
        }
      }
    }
  }
  return out;
}

/**
 * Trigger 2 — Spreadsheet edit.
 * Detects a change to the Status column in New Buyers and acts on approval/rejection.
 * Uses LockService to prevent overlapping executions from rapid edits.
 */
function onBuyerStatusEdit(e) {
  var lock = mykTryLock(5000);
  if (!lock) return;
  try {
    var sheet = e.range.getSheet();
    if (sheet.getName() !== MYK.NEW_BUYERS_SHEET) return;

    var headers = mykReadHeaders(sheet);
    var statusCol = headers.indexOf('Status');
    if (statusCol === -1) return;

    var editedCol = e.range.getColumn() - 1; // 0-based
    if (editedCol !== statusCol) return;

    var rowNumber = e.range.getRow();
    if (rowNumber < 2) return; // header row

    var status = mykStr(e.value || sheet.getRange(rowNumber, statusCol + 1).getValue());
    mykLog('New Buyers row ' + rowNumber + ' Status changed to: ' + status);

    if (status === 'Approved') {
      handleNewBuyerApproval_(sheet, headers, rowNumber);
    } else if (status === 'Rejected') {
      handleNewBuyerRejection_(sheet, headers, rowNumber);
    }
  } catch (err) {
    console.error('[SYNC] onBuyerStatusEdit error: ' + err.message);
  } finally {
    mykReleaseLock(lock);
  }
}

/**
 * On rejection: set approval date, cancel any existing calendar booking,
 * and update dashboard. No email is sent to the buyer.
 */
function handleNewBuyerRejection_(sheet, headers, rowNumber) {
  mykSetCellByHeader(sheet, headers, rowNumber, 'Approval Date', mykFormatDate(new Date()));

  var name = mykGetCellByHeader(sheet, headers, rowNumber, 'Name');
  var email = mykGetCellByHeader(sheet, headers, rowNumber, 'Email address');
  var eventId = mykGetCellByHeader(sheet, headers, rowNumber, 'Event ID');
  var bookingStatus = mykGetCellByHeader(sheet, headers, rowNumber, 'Booking Status');

  // If a meeting was already booked, cancel the calendar event.
  if (eventId && bookingStatus === 'Booked') {
    try {
      var cal = CalendarApp.getCalendarById(MYK.CALENDAR_ID);
      var event = cal.getEventById(eventId);
      if (event) {
        event.cancelCalendarEvent();
        mykLog('Cancelled calendar event ' + eventId + ' for rejected buyer ' + name);
      }
    } catch (err) {
      mykLog('Could not cancel event ' + eventId + ': ' + err.message);
    }
  }

  // Update booking status to reflect rejection.
  if (bookingStatus === 'Booked') {
    mykSetCellByHeader(sheet, headers, rowNumber, 'Booking Status', 'Cancelled');
    mykLog('Booking status set to Cancelled for rejected buyer row ' + rowNumber);
  }

  mykLog('Buyer rejected: row ' + rowNumber + ' — no email sent (per spec).');
  updateDashboard();
}

/**
 * On approval: set approval date, send booking email, mark Email Sent = Yes.
 */
function handleNewBuyerApproval_(sheet, headers, rowNumber) {
  var name = mykGetCellByHeader(sheet, headers, rowNumber, 'Name');
  var email = mykGetCellByHeader(sheet, headers, rowNumber, 'Email address');

  // Set Approval Date.
  mykSetCellByHeader(sheet, headers, rowNumber, 'Approval Date', mykFormatDate(new Date()));

  // Avoid duplicate emails — but allow retry if a previous send failed.
  var alreadySent = mykGetCellByHeader(sheet, headers, rowNumber, 'Email Sent');
  if (alreadySent === 'Yes') {
    mykLog('Booking email already sent to row ' + rowNumber + '. Skipping.');
    return;
  }
  if (alreadySent === 'Failed') {
    mykLog('Previous booking email failed for row ' + rowNumber + '. Retrying.');
  }

  // If the buyer was previously rejected and had a booking cancelled,
  // reset the booking fields so they can book fresh.
  var bookingStatus = mykGetCellByHeader(sheet, headers, rowNumber, 'Booking Status');
  if (bookingStatus === 'Cancelled') {
    mykSetCellByHeader(sheet, headers, rowNumber, 'Booking Status', 'Not Booked');
    mykSetCellByHeader(sheet, headers, rowNumber, 'Meeting Date/Time', '');
    mykSetCellByHeader(sheet, headers, rowNumber, 'Event ID', '');
    mykSetCellByHeader(sheet, headers, rowNumber, 'Confirmation Sent', '');
    mykLog('Reset booking fields for previously-rejected buyer row ' + rowNumber);
  }

  // Send the booking email (with built-in retry).
  var sent = sendNewBuyerBookingEmail(name, email);
  if (sent) {
    mykSetCellByHeader(sheet, headers, rowNumber, 'Email Sent', 'Yes');
    mykLog('Booking email sent to ' + name + ' <' + email + '>');
  } else {
    mykSetCellByHeader(sheet, headers, rowNumber, 'Email Sent', 'Failed');
    mykLog('Booking email FAILED for ' + name + ' <' + email + '>. Re-set Status to Approved to retry.');
  }

  updateDashboard();
}
