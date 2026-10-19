const fs = require('fs')
const edits = {
  'app/src/pages/CalendarPage.tsx': [["navigate('/attorney-dashboard/cases/scheduling')", "navigate('/attorney-dashboard/cases/calendar?tab=booking')"]],
  'app/src/pages/AddContactPage.tsx': [["'/attorney-dashboard/cases/contacts'", "'/attorney-dashboard/cases/active?tab=contacts'"]],
  'api/src/routes/firm-dashboard.ts': [['`/attorney-dashboard/cases/team?dm=${meId}`', '`/attorney-dashboard/cases/messages?tab=team&dm=${meId}`']],
  'api/src/lib/calendar-sync.ts': [
    ['  // Land on Scheduling settings (owns', '  // Land on the Calendar booking-link tab (owns'],
    ["new URL('/attorney-dashboard/cases/scheduling', webBaseUrl())\n", "new URL('/attorney-dashboard/cases/calendar', webBaseUrl())\n  url.searchParams.set('tab', 'booking')\n"],
  ],
}
for (const [file, pairs] of Object.entries(edits)) {
  let t = fs.readFileSync(file, 'utf8')
  const eol = t.includes('\r\n') ? '\r\n' : '\n'
  t = t.replace(/\r\n/g, '\n')
  for (const [from, to] of pairs) {
    const n = t.split(from).length - 1
    if (n !== 1) {
      console.error(`FAILED (${n}x) ${file}: ${from}`)
      process.exit(1)
    }
    t = t.replace(from, to)
  }
  fs.writeFileSync(file, t.replace(/\n/g, eol), 'utf8')
  console.log('ok ' + file)
}
