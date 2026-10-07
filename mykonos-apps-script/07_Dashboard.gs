/**
 * MYKONOS Dubai — Dashboard
 * Rebuilds the Dashboard sheet with branded summary metrics and a meeting list.
 * Throttled: skips a full rebuild when the underlying data hasn't changed
 * (tracked via a signature stored in SyncState).
 */

// Brand colors (hex without # for SpreadsheetApp color methods).
var BRAND = {
  NAVY:      '071D49',
  NAVY_DARK: '041232',
  GOLD:      'B8985F',
  GOLD_LIGHT:'D9B25E',
  WHITE:     'FFFFFF',
  GREY_BG:   'F5F5F5',
  GREY_TEXT: '666666',
  GREEN:     '2E7D32',
  RED:       'C62828',
  AMBER:     'F57F17'
};

/**
 * Force a dashboard rebuild (bypasses the signature throttle).
 * Run this from the Apps Script editor after updating the dashboard code.
 */
function forceDashboardRebuild() {
  mykSetDashboardSignature('');
  updateDashboard();
}

function updateDashboard() {
  var ss = mykGetSpreadsheet();
  var dash = mykGetSheet(MYK.DASHBOARD_SHEET);

  var nbSheet = mykGetSheet(MYK.NEW_BUYERS_SHEET);
  var ebSheet = mykGetSheet(MYK.EXISTING_BUYERS_SHEET);
  var nbHeaders = mykReadHeaders(nbSheet);
  var ebHeaders = mykReadHeaders(ebSheet);

  var nbData = nbSheet.getDataRange().getValues();
  var ebData = ebSheet.getDataRange().getValues();

  // --- Throttle: compute a signature and skip rebuild if unchanged ---
  var signature = computeDashboardSignature_(nbData, ebData, nbHeaders, ebHeaders);
  if (signature === mykGetDashboardSignature()) {
    return;
  }

  // Clear previous content.
  dash.clearContents();
  dash.clearFormats();

  // --- New Buyers metrics ---
  var totalReg = Math.max(0, nbData.length - 1);
  var pending = 0, approved = 0, rejected = 0, emailsSent = 0, nbBooked = 0;
  for (var i = 1; i < nbData.length; i++) {
    var status = mykStr(nbData[i][nbHeaders.indexOf('Status')]);
    var emailSent = mykStr(nbData[i][nbHeaders.indexOf('Email Sent')]);
    var bookingStatus = mykStr(nbData[i][nbHeaders.indexOf('Booking Status')]);
    if (status === 'Pending') pending++;
    if (status === 'Approved') approved++;
    if (status === 'Rejected') rejected++;
    if (emailSent === 'Yes') emailsSent++;
    if (bookingStatus === 'Booked') nbBooked++;
  }
  var approvedNotBooked = Math.max(0, approved - nbBooked);
  var nbRate = approved > 0 ? Math.round((nbBooked / approved) * 100) : 0;

  // --- Existing Buyers metrics ---
  var ebMeetings = Math.max(0, ebData.length - 1);
  var ebBooked = 0;
  for (var j = 1; j < ebData.length; j++) {
    var bStatus = mykStr(ebData[j][ebHeaders.indexOf('Booking Status')]);
    if (bStatus === 'Booked') ebBooked++;
  }

  // --- Combined ---
  var totalMeetings = nbBooked + ebBooked;

  // --- Build dashboard rows ---
  var rows = [];

  // Title row.
  rows.push(['MYKONOS Dubai — Dashboard', '', '', '', '', '', '']);
  rows.push(['Exhibition: ' + MYK.EVENT_DATES + '  ·  ' + MYK.MEETING_DURATION + ' meetings', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '']); // spacer

  // New Buyers section.
  rows.push(['NEW BUYERS', '', '', '', '', '', '']);
  rows.push(['Total registrations', totalReg, '', 'Approved', approved, '', '']);
  rows.push(['Pending approval', pending, '', 'Rejected', rejected, '', '']);
  rows.push(['Booking emails sent', emailsSent, '', 'Approved but not booked', approvedNotBooked, '', '']);
  rows.push(['New buyer meetings', nbBooked, '', 'Booking rate', nbRate + '%', '', '']);
  rows.push(['', '', '', '', '', '', '']); // spacer

  // Existing Buyers section.
  rows.push(['EXISTING BUYERS', '', '', '', '', '', '']);
  rows.push(['Total bookings', ebMeetings, '', 'Confirmed (Booked)', ebBooked, '', '']);
  rows.push(['', '', '', '', '', '', '']); // spacer

  // Combined section.
  rows.push(['COMBINED', '', '', '', '', '', '']);
  rows.push(['Total meetings booked', totalMeetings, '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '']); // spacer

  // Meeting list header.
  rows.push(['MEETING LIST', '', '', '', '', '', '']);
  rows.push(['#', 'Buyer', 'Company', 'Email', 'Meeting Date/Time', 'Buyer Type', 'Status']);

  // --- Meeting list ---
  var meetingNum = 0;
  for (var k = 1; k < nbData.length; k++) {
    var bStatus2 = mykStr(nbData[k][nbHeaders.indexOf('Booking Status')]);
    if (bStatus2 === 'Booked') {
      meetingNum++;
      rows.push([
        meetingNum,
        mykStr(nbData[k][nbHeaders.indexOf('Name')]),
        mykStr(nbData[k][nbHeaders.indexOf('Company name')]),
        mykStr(nbData[k][nbHeaders.indexOf('Email address')]),
        mykFormatDate(nbData[k][nbHeaders.indexOf('Meeting Date/Time')]),
        'New Buyer',
        bStatus2
      ]);
    }
  }
  for (var m = 1; m < ebData.length; m++) {
    var bStatus3 = mykStr(ebData[m][ebHeaders.indexOf('Booking Status')]);
    if (bStatus3 === 'Booked') {
      meetingNum++;
      rows.push([
        meetingNum,
        mykStr(ebData[m][ebHeaders.indexOf('Name')]),
        mykStr(ebData[m][ebHeaders.indexOf('Company name')]),
        mykStr(ebData[m][ebHeaders.indexOf('Email address')]),
        mykFormatDate(ebData[m][ebHeaders.indexOf('Meeting Date/Time')]),
        'Existing Buyer',
        bStatus3
      ]);
    }
  }

  // Pad rows to equal width.
  var maxCols = 7;
  for (var r = 0; r < rows.length; r++) {
    while (rows[r].length < maxCols) rows[r].push('');
  }

  // Write all data at once.
  dash.getRange(1, 1, rows.length, maxCols).setValues(rows);

  // ============================================================
  // Formatting
  // ============================================================

  // --- Title row (row 1) ---
  var titleRange = dash.getRange(1, 1, 1, maxCols);
  titleRange
    .setBackground('#' + BRAND.NAVY)
    .setFontColor('#' + BRAND.GOLD_LIGHT)
    .setFontWeight('bold')
    .setFontSize(16)
    .setVerticalAlignment('middle');
  dash.setRowHeight(1, 40);

  // --- Subtitle row (row 2) ---
  var subRange = dash.getRange(2, 1, 1, maxCols);
  subRange
    .setBackground('#' + BRAND.NAVY_DARK)
    .setFontColor('#' + BRAND.WHITE)
    .setFontSize(10)
    .setVerticalAlignment('middle');
  dash.setRowHeight(2, 22);

  // --- Section headers (NEW BUYERS, EXISTING BUYERS, COMBINED, MEETING LIST) ---
  // Find section header rows by content.
  for (var r2 = 0; r2 < rows.length; r2++) {
    var cellVal = mykStr(rows[r2][0]).toUpperCase();
    if (cellVal === 'NEW BUYERS' || cellVal === 'EXISTING BUYERS' ||
        cellVal === 'COMBINED' || cellVal === 'MEETING LIST') {
      dash.getRange(r2 + 1, 1, 1, maxCols)
        .setBackground('#' + BRAND.NAVY)
        .setFontColor('#' + BRAND.WHITE)
        .setFontWeight('bold')
        .setFontSize(11);
      dash.setRowHeight(r2 + 1, 28);
    }
  }

  // --- Metric label columns (col A and col D) — gold labels ---
  // Metric rows have a label in col A and a value in col B.
  // Some also have a label in col D and value in col E.
  for (var r3 = 0; r3 < rows.length; r3++) {
    var labelA = mykStr(rows[r3][0]);
    var valB = rows[r3][1];
    var labelD = mykStr(rows[r3][3]);
    var valE = rows[r3][4];

    // Skip section headers, spacers, title, and meeting list rows.
    var upperA = labelA.toUpperCase();
    var isSection = (upperA === 'NEW BUYERS' || upperA === 'EXISTING BUYERS' ||
                     upperA === 'COMBINED' || upperA === 'MEETING LIST');
    var isTitle = (r3 < 3);
    var isListHeader = (upperA === '#');
    var isListItem = (typeof valB === 'number' || (labelA !== '' && mykStr(valB) !== '' && !isSection && !isTitle));

    if (isSection || isTitle || isListHeader) continue;

    // Metric label in col A.
    if (labelA && mykStr(valB) !== '') {
      dash.getRange(r3 + 1, 1).setFontColor('#' + BRAND.GREY_TEXT).setFontSize(10);
      dash.getRange(r3 + 1, 2).setFontWeight('bold').setFontColor('#' + BRAND.NAVY).setFontSize(12);
    }
    // Metric label in col D.
    if (labelD && mykStr(valE) !== '') {
      dash.getRange(r3 + 1, 4).setFontColor('#' + BRAND.GREY_TEXT).setFontSize(10);
      dash.getRange(r3 + 1, 5).setFontWeight('bold').setFontColor('#' + BRAND.NAVY).setFontSize(12);
    }
  }

  // --- Meeting list header row ---
  for (var r4 = 0; r4 < rows.length; r4++) {
    if (mykStr(rows[r4][0]) === '#') {
      dash.getRange(r4 + 1, 1, 1, maxCols)
        .setBackground('#' + BRAND.GREY_BG)
        .setFontWeight('bold')
        .setFontColor('#' + BRAND.NAVY)
        .setFontSize(10);
      break;
    }
  }

  // --- Meeting list rows — alternating row colors ---
  var listStartRow = -1;
  for (var r5 = 0; r5 < rows.length; r5++) {
    if (mykStr(rows[r5][0]) === '#') { listStartRow = r5 + 2; break; } // data starts after # row
  }
  if (listStartRow > 0) {
    for (var r6 = listStartRow; r6 <= rows.length; r6++) {
      var altIdx = r6 - listStartRow;
      if (altIdx % 2 === 0) {
        dash.getRange(r6, 1, 1, maxCols).setBackground('#' + BRAND.GREY_BG);
      }
      dash.getRange(r6, 1, 1, maxCols).setFontSize(10);
    }
  }

  // --- Column widths ---
  dash.setColumnWidth(1, 220);  // Label / #
  dash.setColumnWidth(2, 200);  // Value / Buyer
  dash.setColumnWidth(3, 200);  // Company
  dash.setColumnWidth(4, 220);  // Label / Email
  dash.setColumnWidth(5, 120);  // Value / Date
  dash.setColumnWidth(6, 180);  // Buyer Type
  dash.setColumnWidth(7, 100);  // Status

  // Freeze the title rows.
  dash.setFrozenRows(2);

  // Store the signature.
  mykSetDashboardSignature(signature);
  mykLog('Dashboard updated.');
}

/**
 * Compute a lightweight signature of the dashboard-relevant data.
 * If this string doesn't change between runs, the dashboard is not rebuilt.
 */
function computeDashboardSignature_(nbData, ebData, nbHeaders, ebHeaders) {
  var parts = [];
  parts.push('NB:' + (nbData.length - 1));
  for (var i = 1; i < nbData.length; i++) {
    parts.push(mykStr(nbData[i][nbHeaders.indexOf('Status')]) + '|' +
               mykStr(nbData[i][nbHeaders.indexOf('Email Sent')]) + '|' +
               mykStr(nbData[i][nbHeaders.indexOf('Booking Status')]) + '|' +
               mykFormatDate(nbData[i][nbHeaders.indexOf('Meeting Date/Time')]));
  }
  parts.push('EB:' + (ebData.length - 1));
  for (var j = 1; j < ebData.length; j++) {
    parts.push(mykStr(ebData[j][ebHeaders.indexOf('Booking Status')]) + '|' +
               mykFormatDate(ebData[j][ebHeaders.indexOf('Meeting Date/Time')]) + '|' +
               mykStr(ebData[j][ebHeaders.indexOf('Event ID')]));
  }
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    parts.join('\n'),
    Utilities.Charset.UTF_8
  ).join('');
}
