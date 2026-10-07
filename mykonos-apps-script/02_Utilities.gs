/**
 * MYKONOS Dubai — Utilities
 * Logging, locking, timezone, and small helpers.
 */

/** Central logger that prefixes every message with [SYNC]. */
function mykLog(message) {
  console.log('[SYNC] ' + message);
}

/** Get the script lock; returns null if already held by another run. */
function mykTryLock(timeoutMs) {
  var lock = LockService.getScriptLock();
  try {
    var got = lock.tryLock(timeoutMs || 5000);
    if (!got) {
      mykLog('Another synchronization is already running. Exiting.');
      return null;
    }
    return lock;
  } catch (e) {
    mykLog('Lock error: ' + e.message);
    return null;
  }
}

/** Release a lock obtained via mykTryLock. */
function mykReleaseLock(lock) {
  if (lock) {
    try { lock.releaseLock(); } catch (e) { /* ignore */ }
  }
}

/** Format a Date in the project timezone, or return '' for null. */
function mykFormatDate(date) {
  if (!date) return '';
  try {
    return Utilities.formatDate(date, MYK.TIMEZONE, 'yyyy-MM-dd HH:mm');
  } catch (e) {
    return String(date);
  }
}

/** Normalize an email to lowercase trimmed string. */
function mykNormalizeEmail(email) {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}

/** Trim a value, returning '' for null/undefined. */
function mykStr(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/** Return the value of a cell or '' if undefined. */
function mykCell(v) {
  return (v === undefined || v === null) ? '' : v;
}

/**
 * Find a row index (1-based) in a sheet where `columnHeader` matches `value`.
 * Uses normalized comparison for emails.
 */
function mykFindRow(sheet, headers, columnHeader, value, opts) {
  var opts = opts || {};
  var colIdx = headers.indexOf(columnHeader);
  if (colIdx === -1) return -1;
  var data = sheet.getDataRange().getValues();
  var compareVal = opts.email ? mykNormalizeEmail(value) : mykStr(value);
  for (var i = 1; i < data.length; i++) {
    var cellVal = opts.email ? mykNormalizeEmail(data[i][colIdx]) : mykStr(data[i][colIdx]);
    if (cellVal !== '' && cellVal === compareVal) {
      return i + 1; // 1-based row number
    }
  }
  return -1;
}

/** Get the active spreadsheet, creating a bound reference. */
function mykGetSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/** Get or create a sheet by name. */
function mykGetSheet(name) {
  var ss = mykGetSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/** Ensure a sheet has the given headers in row 1. Clears any extra columns. */
function mykEnsureHeaders(sheet, headers) {
  // Clear any extra columns beyond headers.length.
  var lastCol = sheet.getLastColumn();
  if (lastCol > headers.length) {
    sheet.getRange(1, headers.length + 1, 1, lastCol - headers.length).clearContent();
  }
  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  var headerRow = sheet.getRange(1, 1, 1, headers.length);
  headerRow.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

/** Read headers from row 1 of a sheet. */
function mykReadHeaders(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}

/** Set a single cell value by header name. */
function mykSetCellByHeader(sheet, headers, rowNumber, header, value) {
  var colIdx = headers.indexOf(header);
  if (colIdx === -1) return;
  if (value === null || value === undefined) value = '';
  sheet.getRange(rowNumber, colIdx + 1).setValue(value);
}

/** Get a single cell value by header name. */
function mykGetCellByHeader(sheet, headers, rowNumber, header) {
  var colIdx = headers.indexOf(header);
  if (colIdx === -1) return '';
  return mykCell(sheet.getRange(rowNumber, colIdx + 1).getValue());
}

// ============================================================
// SyncState — persistent key/value store on a hidden sheet
// ============================================================

/** Get the SyncState sheet (creates + hides it if missing). */
function mykGetSyncStateSheet() {
  var ss = mykGetSpreadsheet();
  var sheet = ss.getSheetByName(MYK.SYNC_STATE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(MYK.SYNC_STATE_SHEET);
    sheet.getRange(1, 1, 1, 2).setValues([SYNC_STATE_HEADERS]);
    sheet.setFrozenRows(1);
  }
  if (!sheet.isSheetHidden()) sheet.hideSheet();
  return sheet;
}

/** Read a value from SyncState by key. Returns '' if not found. */
function mykStateGet(key) {
  var sheet = mykGetSyncStateSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (mykStr(data[i][0]) === key) return mykStr(data[i][1]);
  }
  return '';
}

/** Write a value to SyncState by key (upsert). */
function mykStateSet(key, value) {
  var sheet = mykGetSyncStateSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (mykStr(data[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

/** Read the last sync timestamp as a Date (or null). */
function mykGetLastSyncTime() {
  var v = mykStateGet('lastSyncTime');
  if (!v) return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/** Store the current time as the last sync timestamp. */
function mykSetLastSyncTime(d) {
  mykStateSet('lastSyncTime', (d || new Date()).toISOString());
}

/** Read the last dashboard signature (for throttling dashboard rebuilds). */
function mykGetDashboardSignature() {
  return mykStateGet('dashboardSignature');
}

/** Store a dashboard signature. */
function mykSetDashboardSignature(sig) {
  mykStateSet('dashboardSignature', sig);
}
