# MYKONOS Dubai — Meeting Automation (Google Apps Script)

End-to-end Google Apps Script automation for the MYKONOS Dubai exhibition meeting workflow.

## What it does

**Journey A — New Buyer**
Google Form → CEO approval → booking email → Google Appointment Schedule → calendar event → `New Buyers` updated → Dashboard updated

**Journey B — Existing Buyer**
Google Appointment Schedule directly → books a meeting → calendar event created → buyer details captured → `Existing Buyers` updated → Dashboard updated

No manual script execution is required after setup. A time-based trigger syncs the calendar every 1 minute.

## Files

| File | Purpose |
|------|---------|
| `01_Config.gs` | All editable constants (calendar ID, booking link, details, sheet names) |
| `02_Utilities.gs` | Logging, locking, timezone, sheet helpers |
| `03_Setup.gs` | One-time setup: sheets, headers, triggers, initial sync |
| `04_NewBuyerFlow.gs` | Form-submit + CEO-approval triggers |
| `05_Email.gs` | New buyer booking email |
| `06_CalendarSync.gs` | Calendar detection, field extraction, dedupe, reschedule, cancel |
| `07_Dashboard.gs` | Dashboard metrics + meeting list |

## Setup (run once)

1. **Open your Google Sheet** (the one linked to the Google Form).
2. **Extensions → Apps Script** to open the script editor.
3. **Create each `.gs` file** (left sidebar → `+` → Script) and paste the contents of each file here. Keep the `01_…07_` prefixes so load order is predictable.
4. **Enable the Calendar Advanced Service** (optional but recommended for richer fields):
   - Left sidebar → `+` next to **Services** → add **Google Calendar API**.
   - This lets the script read custom Appointment Schedule booking fields when Google exposes them.
   - If you skip this, the script still works using CalendarApp + description parsing.
5. **Edit `01_Config.gs`**:
   - Set `BOOKING_LINK` to your Google Appointment Schedule booking URL
     (the `https://calendar.google.com/calendar/appointments/.../sched` link).
   - Confirm `CALENDAR_ID` = `events.officialmykonos@gmail.com`.
   - Adjust exhibition details if needed.
6. **Set spreadsheet timezone** to `Asia/Dubai`:
   - File → Settings → Time zone → `(GMT+04:00) Asia/Dubai`.
7. **Run `setupMykonosSystem`** once:
   - Select `setupMykonosSystem` from the function dropdown → **Run**.
   - Authorize the script when prompted.
   - Check the execution log for `=== MYKONOS Setup complete ===`.
8. **Done.** Triggers are now installed and the system runs automatically.

## Triggers installed by setup

| Trigger | Function | Purpose |
|---------|----------|---------|
| Form submit | `onNewBuyerFormSubmit` | Initialize a new buyer record (Status = Pending) |
| Spreadsheet edit | `onBuyerStatusEdit` | Detect CEO approval → send booking email (rejection = no email) |
| Time-based (every 1 min) | `syncMykonosMeetings` | Detect new/changed/cancelled appointments |

## Sheets

| Sheet | Purpose |
|-------|---------|
| `New Buyers` | Form submissions + CEO approval workflow |
| `Existing Buyers` | Direct bookings via Appointment Schedule |
| `Dashboard` | Summary metrics + meeting list |
| `SyncState` (hidden) | Last-sync timestamp + dashboard signature (for throttling) |

## Performance optimizations

- **Narrow scan window:** the calendar sync scans only the exhibition dates (Oct 3–10) plus a 7-day padding on each side, not ±30 days from "now".
- **Sync watermark:** a `lastSyncTime` stored in the hidden `SyncState` sheet lets each run skip events that haven't been updated since the last sync.
- **Dashboard throttling:** the dashboard is only rebuilt when the underlying data actually changes (tracked via an MD5 signature), so it doesn't flicker every minute while you're viewing it.
- **Status dropdown:** a data-validation dropdown on the `Status` column prevents CEO typos from breaking the approval flow.
- **Timezone-safe matching:** email+time dedupe compares Date epoch values (not formatted strings) with a 1-minute tolerance, so manually-edited cells or differing display formats don't break matching.
- **Email retry:** all emails (booking, rejection, confirmation) retry up to 3 times with exponential backoff. Failed sends are marked `Failed` and can be retried manually.
- **Booking confirmation email:** when a buyer books a slot, they automatically receive a confirmation email with the meeting date/time, location, and WhatsApp contact. On reschedule, a new confirmation is sent automatically.
- **Cancellation fallback:** if Google regenerates an event ID on cancel, the system falls back to matching by email + meeting time to still mark the row as `Cancelled`.

## How the CEO approves

1. Open the `New Buyers` sheet.
2. Set the `Status` column to `Approved` (or `Rejected`) using the dropdown.
3. The automation:
   - Sets `Approval Date`
   - If **Approved**: sends the booking email (once — `Email Sent = Yes` prevents duplicates)
   - If **Rejected**: no email is sent (per spec); the row is simply marked rejected
   - Updates the Dashboard

## How calendar sync works

- Every 1 minute, `syncMykonosMeetings` scans the calendar ±30 days.
- For each event it extracts buyer info from: attendees, title, description, and (if enabled) the Calendar Advanced Service's custom fields / extended properties.
- **Buyer type detection:**
  1. Email found in `New Buyers` → New Buyer (updates that row).
  2. Email found in `Existing Buyers` → Existing Buyer.
  3. Otherwise → new `Existing Buyers` row.
- **Duplicate prevention:** matches by `Event ID` first, then `Email + Meeting Date/Time`.
- **Reschedule:** same Event ID → same row, `Meeting Date/Time` updated, no duplicate.
- **Rebook (another meeting):** different Event ID → separate row (multiple meetings per buyer supported).
- **Cancellation:** `Booking Status = Cancelled`, row preserved.
- **Event enrichment:** renames the event to `MYKONOS × [Company] — [Name]` and writes a structured description.
- **Data priority:** blank calendar fields never overwrite existing sheet data.
- **Error tolerance:** a single bad event never stops the whole sync (per-event try/catch).
- **Locking:** `LockService.getScriptLock()` prevents concurrent runs.

## Acceptance tests (manual)

| # | Test | Expected result |
|---|------|-----------------|
| 1 | Submit form | `New Buyers → Status = Pending` |
| 2 | Set Status = Approved | Booking email sent once |
| 3 | New buyer books appointment | `New Buyers → Booking Status = Booked`, `Meeting Date/Time` set, no `Existing Buyers` duplicate |
| 4 | Existing buyer books directly (email not in New Buyers) | New row in `Existing Buyers` with all fields + Event ID |
| 5 | Reschedule a meeting | Same row updated, no duplicate |
| 6 | Same existing buyer books another meeting | Separate row with different Event ID |
| 7 | Cancel an appointment | `Booking Status = Cancelled` |
| 8 | Run sync multiple times | No duplicate rows |
| 9 | Event with missing optional data | Existing data preserved, sync does not fail |
| 10 | Unrelated calendar event | Ignored or safely processed |

## Troubleshooting

- **Booking email not sending:** check `BOOKING_LINK` in `01_Config.gs` and that the script is authorized to send email. If `Email Sent = Failed`, re-set the `Status` column to `Approved` to retry.
- **Confirmation email failed:** run `retryFailedConfirmationEmails()` from the script editor to resend any confirmations marked `Failed`.
- **Calendar events not detected:** confirm `CALENDAR_ID` is correct and the calendar is accessible by the script account.
- **Custom fields missing:** enable the Calendar Advanced Service (step 4). Google Appointment Schedule stores custom booking fields inconsistently; the script parses attendees, title, description, and extended properties to recover them.
- **`Calendar.Events.get … Not Found`:** this is handled gracefully — the script falls back to the CalendarApp event object and continues. It never terminates the sync on a 404.
- **Duplicate triggers:** run `uninstallMykonosTriggers()` then `setupMykonosSystem()` again.
- **Logs:** Executions → any run → check the log for `[SYNC] …` lines.

## Notes

- The script is idempotent: running `syncMykonosMeetings` repeatedly creates no duplicates.
- The Google Appointment Schedule must be created on the `events.officialmykonos@gmail.com` calendar.
- The Google Form must be linked to the same Google Sheet so that form submissions land in `New Buyers`.
