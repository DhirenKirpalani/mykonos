/**
 * MYKONOS Dubai — Meeting Automation
 * Configuration constants. Edit these values to match your Google Workspace.
 */

var MYK = {
  // === Calendar ===
  // The calendar email that owns the Appointment Schedule.
  CALENDAR_ID: 'manager@officialmykonos.com',

  // The email account running this script (used for the "from" address).
  SENDER_EMAIL: 'manager@officialmykonos.com',

  // === Google Form registration link ===
  // The Google Form URL for new buyer registration.
  GOOGLE_FORM_URL: 'https://forms.gle/1vmCFpJaNSQ2xhqt7',

  // === Appointment Schedule booking link ===
  // Paste the Google Appointment Schedule booking link here.
  // It looks like: https://calendar.google.com/calendar/appointments/.../sched
  BOOKING_LINK: 'https://calendar.app.google/EvaiAXeihBD31aq16',

  // === Exhibition details ===
  EVENT_TITLE: 'MYKONOS Dubai',
  EVENT_DATES: 'October 3–10',
  MEETING_DURATION: '30 minutes',
  LOCATION: 'Fairmont Hotel Dubai, Sheikh Zayed Road\nThe Summit Hall – Level 33',
  DIRECTIONS: 'Use the Skybridge from DWTC to Fairmont Hotel. Approximately a 10-minute walk.',
  WHATSAPP_NUMBER: '+62 816 2617 83',
  WHATSAPP_LINK: 'https://wa.me/62816261783',

  // === Timezone ===
  TIMEZONE: 'Asia/Dubai',

  // === Sheet names ===
  NEW_BUYERS_SHEET: 'New Buyers',
  EXISTING_BUYERS_SHEET: 'Existing Buyers',
  DASHBOARD_SHEET: 'Dashboard',
  SYNC_STATE_SHEET: 'SyncState',

  // === Exhibition date bounds (used to narrow the calendar scan window) ===
  // Format: YYYY-MM-DD. The sync scans from a few days before EXHIBITION_START
  // to a few days after EXHIBITION_END, instead of ±30 days from "now".
  EXHIBITION_START: '2026-10-03',
  EXHIBITION_END: '2026-10-10',

  // === Sync window (days padding around the exhibition dates) ===
  SYNC_DAYS_BEFORE: 7,
  SYNC_DAYS_AFTER: 7,

  // === Trigger cadence (minutes) ===
  SYNC_EVERY_MINUTES: 1
};

// === Column headers ===
// New Buyers columns match the Google Form's actual field names and order.
var NEW_BUYERS_HEADERS = [
  'Timestamp',
  'Email address',
  'Name',
  'WhatsApp number',
  'Country',
  'Company name',
  'Company website',
  'What best describes your business?',
  'What would you like to collaborate on?',
  'Status',
  'Approval Date',
  'Email Sent',
  'Booking Status',
  'Meeting Date/Time',
  'Booking Timestamp',
  'Event ID',
  'Confirmation Sent'
];

var EXISTING_BUYERS_HEADERS = [
  'Timestamp',
  'Name',
  'Email address',
  'Company name',
  'WhatsApp number',
  'Country',
  'Meeting purpose',
  'Meeting Date/Time',
  'Booking Status',
  'Event ID',
  'Booking Timestamp',
  'Confirmation Sent'
];

var DASHBOARD_HEADERS = [
  'MYKONOS Dubai — Dashboard',
  '',
  '',
  ''
];

var SYNC_STATE_HEADERS = ['Key', 'Value'];

/**
 * Mapping from our internal New Buyers header names to the possible
 * Google Form field titles. The first match found in e.namedValues wins.
 * If your form fields are named exactly like the headers, this still works.
 */
var FORM_FIELD_ALIASES = {
  'Email address': ['Email address', 'Email Address', 'Email', 'Your Email', 'Buyer Email'],
  'Name': ['Name', 'Full Name', 'Your Name', 'Buyer Name'],
  'Company name': ['Company name', 'Company Name', 'Company', 'Your Company'],
  'WhatsApp number': ['WhatsApp number', 'WhatsApp Number', 'WhatsApp', 'Your WhatsApp', 'Phone', 'Phone Number'],
  'Country': ['Country', 'Your Country'],
  'What would you like to collaborate on?': ['What would you like to collaborate on?', 'Meeting Purpose', 'Purpose', 'Why do you want to meet?']
};
