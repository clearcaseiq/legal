import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'docs', 'zoom-marketplace', 'technical-design')
const output = path.join(outputDir, 'clearcaseiq-zoom-architecture.png')

const html = `<!doctype html>
<html>
<head>
<style>
  *{box-sizing:border-box}html,body{margin:0;width:1400px;height:900px;overflow:hidden;font-family:Inter,"Segoe UI",Arial,sans-serif;color:#10213d;background:#f5f8fb}
  .page{padding:42px 52px}.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}.brand{font-size:27px;font-weight:850}.brand b{color:#f59e0b}.title{text-align:right}.title h1{font-size:27px;margin:0}.title p{margin:5px 0 0;color:#64748b;font-size:13px}
  .flow{display:grid;grid-template-columns:210px 60px 520px 60px 360px;align-items:center;min-height:555px}.col{display:flex;flex-direction:column;gap:22px}.box{background:white;border:1.5px solid #d6e0e9;border-radius:16px;padding:20px;box-shadow:0 8px 25px rgba(15,35,65,.06)}.box h2{margin:0 0 7px;font-size:17px}.box p{margin:0;color:#64748b;font-size:12px;line-height:1.5}.icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;margin-bottom:12px;background:#e7f3ff;color:#0c67ad;font-size:20px;font-weight:850}
  .core{border:2px solid #0c67ad;padding:22px;background:linear-gradient(145deg,#fff,#f5fbff)}.core-head{display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:1px solid #dbe6ef}.core-head .icon{margin:0}.services{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.service{border:1px solid #dce6ee;border-radius:12px;background:#fff;padding:14px}.service h3{font-size:13px;margin:0 0 5px}.service p{font-size:10px}.api{border-color:#93c5fd;background:#eff8ff}.storage{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.small{padding:13px}.small h3{font-size:12px;margin:0 0 4px}
  .arrow{text-align:center;color:#0c67ad;font-weight:800}.arrow .line{height:3px;background:#0c67ad;position:relative}.arrow .line:after{content:"";position:absolute;right:-2px;top:-5px;border-left:10px solid #0c67ad;border-top:7px solid transparent;border-bottom:7px solid transparent}.arrow span{display:block;font-size:10px;margin-bottom:7px;color:#475569;line-height:1.3}.reverse{margin-top:42px}.reverse .line:after{right:auto;left:-2px;border-left:0;border-right:10px solid #0c67ad}
  .zoom{border:2px solid #2d8cff}.zoom .icon{background:#2d8cff;color:white}.webhook{border-color:#fbbf24}.webhook .icon{background:#fff7db;color:#b77900}
  .legend{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:26px}.pill{background:white;border:1px solid #dbe4ec;border-radius:12px;padding:13px 15px;font-size:11px;color:#475569}.pill strong{display:block;color:#10213d;margin-bottom:4px}.footer{margin-top:20px;color:#64748b;font-size:10px;display:flex;justify-content:space-between}.badge{color:#0a6b46;background:#dcfce7;padding:5px 9px;border-radius:10px;font-weight:750}
</style>
</head>
<body>
<main class="page">
  <header class="header">
    <div class="brand">ClearCase<b>IQ</b></div>
    <div class="title"><h1>Zoom Integration Architecture</h1><p>Production data flow · User-managed OAuth app</p></div>
  </header>

  <section class="flow">
    <div class="col">
      <div class="box">
        <div class="icon">A</div>
        <h2>Attorney browser</h2>
        <p>Connects Zoom, schedules consultations, and starts calls from an authenticated ClearCaseIQ workspace.</p>
      </div>
      <div class="box">
        <div class="icon">C</div>
        <h2>Client portal</h2>
        <p>Authenticated clients receive the meeting details and secure Zoom join link for their consultation.</p>
      </div>
    </div>

    <div>
      <div class="arrow"><span>HTTPS / TLS</span><div class="line"></div></div>
      <div class="arrow reverse"><span>Portal + join link</span><div class="line"></div></div>
    </div>

    <div class="box core">
      <div class="core-head">
        <div class="icon">CIQ</div>
        <div><h2>ClearCaseIQ on AWS</h2><p>Nginx reverse proxy · Dockerized web and API services</p></div>
      </div>
      <div class="services">
        <div class="service">
          <h3>Next.js + React web app</h3>
          <p>Attorney settings, case workspace, scheduling, and client portal interfaces.</p>
        </div>
        <div class="service api">
          <h3>Node.js + Express API</h3>
          <p>OAuth callback, token refresh, meeting creation, authorization, and webhook processing.</p>
        </div>
      </div>
      <div class="storage">
        <div class="service small">
          <h3>AWS RDS PostgreSQL</h3>
          <p>Attorney connection, scoped OAuth tokens, meeting identifiers, links, and timestamps.</p>
        </div>
        <div class="service small">
          <h3>Amazon S3</h3>
          <p>Durable encrypted object storage for case files. Zoom recordings and transcripts are not collected.</p>
        </div>
      </div>
      <div class="storage">
        <div class="service small">
          <h3>Application controls</h3>
          <p>Role-based access, signed OAuth state, short-lived sessions, rate limiting, and audit logging.</p>
        </div>
        <div class="service small">
          <h3>Deployment</h3>
          <p>GitHub Actions builds tested images, stores them in ECR, and deploys through AWS SSM.</p>
        </div>
      </div>
    </div>

    <div>
      <div class="arrow"><span>OAuth 2.0 + REST API<br/>TLS</span><div class="line"></div></div>
      <div class="arrow reverse"><span>Signed webhooks<br/>HMAC-SHA256</span><div class="line"></div></div>
    </div>

    <div class="col">
      <div class="box zoom">
        <div class="icon">Z</div>
        <h2>Zoom OAuth</h2>
        <p>User consent and authorization code exchange. Required scopes:</p>
        <p><strong>user:read:user</strong><br/><strong>meeting:write:meeting</strong></p>
      </div>
      <div class="box">
        <div class="icon">API</div>
        <h2>Zoom REST API</h2>
        <p>Reads the connected user and creates scheduled or instant meetings on that attorney's Zoom account.</p>
      </div>
      <div class="box webhook">
        <div class="icon">↯</div>
        <h2>Zoom webhooks</h2>
        <p>Validates URL challenges and signed lifecycle events, including app deauthorization.</p>
      </div>
    </div>
  </section>

  <section class="legend">
    <div class="pill"><strong>Data minimization</strong>No recordings, transcripts, meeting chat, or meeting content collected.</div>
    <div class="pill"><strong>Tenant isolation</strong>Each attorney authorizes and uses only their own Zoom account.</div>
    <div class="pill"><strong>Revocation</strong>Disconnect revokes the Zoom grant and deletes stored account credentials.</div>
    <div class="pill"><strong>Webhook protection</strong>Timestamp freshness and timing-safe HMAC signature validation.</div>
  </section>
  <footer class="footer"><span>ClearCaseIQ Zoom Marketplace technical design</span><span class="badge">Production architecture</span></footer>
</main>
</body>
</html>`

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 })
await page.setContent(html)
await page.screenshot({ path: output, type: 'png' })
await browser.close()
console.log(`Generated ${output}`)
