/**
 * MYKONOS Dubai — Setup
 * Run setupMykonosSystem() ONCE from the Apps Script editor.
 * It creates sheets, headers, installs triggers, and runs an initial sync.
 */
function setupMykonosSystem() {
  mykLog('=== MYKONOS Setup starting ===');

  var ss = mykGetSpreadsheet();

  // --- New Buyers sheet ---
  var nbSheet = ss.getSheetByName(MYK.NEW_BUYERS_SHEET);
  if (!nbSheet) {
    mykLog('New Buyers sheet missing. Note: it is usually auto-created by the linked Google Form.');
    mykLog('If the form is linked, the sheet should exist. Creating a placeholder.');
    nbSheet = mykGetSheet(MYK.NEW_BUYERS_SHEET);
  }
  mykEnsureHeaders(nbSheet, NEW_BUYERS_HEADERS);

  // --- Status dropdown on New Buyers (prevents CEO typos) ---
  applyStatusDropdown_(nbSheet, NEW_BUYERS_HEADERS);

  // --- Force WhatsApp columns to plain text (prevents Sheets stripping leading 0) ---
  forceTextColumn_(nbSheet, NEW_BUYERS_HEADERS, 'WhatsApp number');

  // --- Existing Buyers sheet ---
  var ebSheet = mykGetSheet(MYK.EXISTING_BUYERS_SHEET);
  mykEnsureHeaders(ebSheet, EXISTING_BUYERS_HEADERS);
  forceTextColumn_(ebSheet, EXISTING_BUYERS_HEADERS, 'WhatsApp number');

  // --- Dashboard sheet ---
  var dashSheet = mykGetSheet(MYK.DASHBOARD_SHEET);

  // --- SyncState sheet (hidden) ---
  mykGetSyncStateSheet();
  mykLog('Sheets verified/created.');

  // --- Install triggers ---
  installMykonosTriggers_();

  // --- Initial sync ---
  mykLog('Running initial synchronization...');
  try {
    syncMykonosMeetings();
  } catch (e) {
    mykLog('Initial sync error (non-fatal): ' + e.message);
  }

  // --- Build dashboard ---
  try {
    updateDashboard();
  } catch (e) {
    mykLog('Initial dashboard error (non-fatal): ' + e.message);
  }

  mykLog('=== MYKONOS Setup complete ===');
  mykLog('No further manual execution is required.');
}

/**
 * Install all required triggers. Safe to call repeatedly (removes duplicates first).
 */
function installMykonosTriggers_() {
  // Remove existing MYKONOS triggers to avoid duplicates.
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var t = triggers[i];
    var handler = t.getHandlerFunction();
    if (handler === 'onNewBuyerFormSubmit' ||
        handler === 'onBuyerStatusEdit' ||
        handler === 'syncMykonosMeetings') {
      ScriptApp.deleteTrigger(t);
    }
  }

  // Trigger 1: Google Form submission -> initialize new buyer record.
  ScriptApp.newTrigger('onNewBuyerFormSubmit')
    .forSpreadsheet(mykGetSpreadsheet())
    .onFormSubmit()
    .create();

  // Trigger 2: Spreadsheet edit -> detect CEO approval/rejection.
  ScriptApp.newTrigger('onBuyerStatusEdit')
    .forSpreadsheet(mykGetSpreadsheet())
    .onEdit()
    .create();

  // Trigger 3: Time-based calendar sync.
  ScriptApp.newTrigger('syncMykonosMeetings')
    .timeBased()
    .everyMinutes(MYK.SYNC_EVERY_MINUTES)
    .create();

  mykLog('Triggers installed: onNewBuyerFormSubmit, onBuyerStatusEdit, syncMykonosMeetings (every ' +
         MYK.SYNC_EVERY_MINUTES + ' min).');
}

/** Remove all MYKONOS triggers (utility, in case you need to reset). */
function uninstallMykonosTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  mykLog('All triggers removed.');
}

/**
 * Retry sending confirmation emails for any rows where Confirmation Sent = 'Failed'.
 * Run this manually from the script editor if you see failed confirmations.
 */
function retryFailedConfirmationEmails() {
  mykLog('=== Retrying failed confirmation emails ===');
  var sheets = [
    { sheet: mykGetSheet(MYK.NEW_BUYERS_SHEET), headers: mykReadHeaders(mykGetSheet(MYK.NEW_BUYERS_SHEET)), timeHeader: 'Meeting Date/Time', nameHeader: 'Name', emailHeader: 'Email address' },
    { sheet: mykGetSheet(MYK.EXISTING_BUYERS_SHEET), headers: mykReadHeaders(mykGetSheet(MYK.EXISTING_BUYERS_SHEET)), timeHeader: 'Meeting Date/Time', nameHeader: 'Name', emailHeader: 'Email address' }
  ];
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s].sheet;
    var headers = sheets[s].headers;
    var data = sheet.getDataRange().getValues();
    var confCol = headers.indexOf('Confirmation Sent');
    var timeCol = headers.indexOf(sheets[s].timeHeader);
    var nameCol = headers.indexOf(sheets[s].nameHeader);
    var emailCol = headers.indexOf(sheets[s].emailHeader);
    if (confCol === -1) continue;
    for (var i = 1; i < data.length; i++) {
      if (mykStr(data[i][confCol]) === 'Failed') {
        var name = mykStr(data[i][nameCol]);
        var email = mykStr(data[i][emailCol]);
        var meetingTime = data[i][timeCol];
        mykLog('Retrying confirmation for row ' + (i + 1) + ': ' + name + ' <' + email + '>');
        sendConfirmationIfNotSent_(sheet, headers, i + 1, name, email, meetingTime);
      }
    }
  }
  mykLog('=== Retry pass complete ===');
}

/**
 * Apply a data-validation dropdown to the Status column of New Buyers.
 * Allowed values: Pending, Approved, Rejected.
 * This prevents the CEO from typing values that the automation won't recognize.
 */
function applyStatusDropdown_(sheet, headers) {
  var statusCol = headers.indexOf('Status');
  if (statusCol === -1) return;
  var col = statusCol + 1;
  var lastRow = Math.max(sheet.getLastRow(), 1000); // cover existing + future rows
  var range = sheet.getRange(2, col, lastRow - 1, 1);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending', 'Approved', 'Rejected'], true)
    .setAllowInvalid(false)
    .setHelpText('Select Pending, Approved, or Rejected')
    .build();
  range.setDataValidation(rule);
  mykLog('Status dropdown applied to New Buyers column ' + col + '.');
}

/**
 * Force a column to plain text format so Google Sheets does not strip
 * leading zeros or reformat phone numbers. Applies to existing + future rows.
 */
function forceTextColumn_(sheet, headers, headerName) {
  var colIdx = headers.indexOf(headerName);
  if (colIdx === -1) return;
  var col = colIdx + 1;
  var lastRow = Math.max(sheet.getLastRow(), 1000);
  var range = sheet.getRange(1, col, lastRow, 1);
  range.setNumberFormat('@'); // '@' = plain text format
  mykLog('Column "' + headerName + '" set to plain text format.');
}
