import http from 'node:http'

const PORT = Number(process.env.PROBE_PORT || 3301)

function get(path) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: 'localhost', port: PORT, path }, (res) => {
        const chunks = []
        res.on('data', (d) => chunks.push(d))
        res.on('end', () => resolve({ buf: Buffer.concat(chunks), headers: res.headers, status: res.statusCode }))
      })
      .on('error', reject)
  })
}

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
}

const ENGLISH_MARKERS = [
  'Get Started',
  'How It Works',
  'Injured in an Accident',
  'See What Your Case',
  'Sign In',
  'Log In',
  'Start Free',
  'Free Case Assessment',
]

const paths = process.argv.slice(2)
for (const path of paths) {
  const { buf, headers, status } = await get(path)
  const html = buf.toString('utf8')
  const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  let seeded = '(none)'
  let payloadKb = '0'
  let language = '(unset)'
  if (nd) {
    const data = JSON.parse(nd[1])
    const messages = data.props?.pageProps?.messages
    language = String(data.props?.pageProps?.language ?? '(unset)')
    if (messages) {
      seeded = Object.keys(messages).join(', ')
      payloadKb = (Buffer.byteLength(JSON.stringify(messages)) / 1024).toFixed(1)
    }
  }
  const text = textOf(html)
  const found = ENGLISH_MARKERS.filter((marker) => text.includes(marker))

  console.log(`=== ${path} (${status}) ===`)
  console.log(`  content-type:        ${headers['content-type']}`)
  console.log(`  mojibake:            ${/Ã[\u0080-\u00bf]/.test(html)}`)
  console.log(`  language prop:       ${language}`)
  console.log(`  seeded namespaces:   ${seeded}`)
  console.log(`  seeded payload:      ${payloadKb} KB`)
  console.log(`  english markers:     ${found.length ? found.join(' | ') : 'none'}`)
  console.log(`  words:               ${text.split(' ').filter((w) => /\w/.test(w)).length}`)
}
