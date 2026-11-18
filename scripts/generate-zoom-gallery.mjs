import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(root, 'docs', 'zoom-marketplace', 'gallery')

const scenes = [
  {
    file: '01-connect-zoom.png',
    eyebrow: 'FAST, SECURE SETUP',
    title: 'Connect Zoom to ClearCaseIQ',
    subtitle: 'Authorize your account once to create consultation links directly from your legal workspace.',
    screen: `
      <div class="page compact">
        <div class="topbar"><div class="wordmark"><span class="shield">⚖</span> ClearCase<span>IQ</span></div><div class="avatar">AR</div></div>
        <div class="center-card">
          <div class="icon blue">●</div>
          <h2>Zoom for ClearCaseIQ</h2>
          <p>Connect your Zoom account so video consultations get a meeting link automatically, clients get a Join button in their portal, and you can start a call from any case.</p>
          <button>Connect Zoom</button>
          <div class="security">🔒 Secure OAuth connection · Disconnect anytime</div>
        </div>
      </div>`,
  },
  {
    file: '02-connected-settings.png',
    eyebrow: 'PER-ATTORNEY CONTROL',
    title: 'Your Zoom account, connected',
    subtitle: 'Each attorney controls their own connection and can reconnect or disconnect at any time.',
    screen: `
      <div class="page">
        <div class="topbar"><div class="wordmark"><span class="shield">⚖</span> ClearCase<span>IQ</span></div><div class="crumb">Settings / Scheduling</div><div class="avatar">AR</div></div>
        <div class="content">
          <div class="section-head"><div><h2>Calendar & video settings</h2><p>Manage scheduling connections for consultations.</p></div></div>
          <div class="settings-card">
            <div class="row">
              <div><div class="zoom-logo">Z</div></div>
              <div class="grow"><h3>Zoom Meetings</h3><p>attorney@demofirm.com</p></div>
              <span class="status">✓ Connected</span>
            </div>
            <div class="divider"></div>
            <p class="muted">Video consultations create a Zoom meeting and share a join link with the client automatically.</p>
            <div class="actions"><button>Reconnect</button><button class="secondary">Disconnect</button></div>
          </div>
        </div>
      </div>`,
  },
  {
    file: '03-schedule-consultation.png',
    eyebrow: 'SCHEDULE IN CONTEXT',
    title: 'Create a video consultation',
    subtitle: 'Choose an available time from the matter and ClearCaseIQ creates the Zoom meeting for you.',
    screen: `
      <div class="page">
        <div class="topbar"><div class="wordmark"><span class="shield">⚖</span> ClearCase<span>IQ</span></div><div class="crumb">Demo matter / Consultations</div><div class="avatar">AR</div></div>
        <div class="modal">
          <div class="modal-title"><div class="calendar">▦</div><div><h2>Schedule your first consultation</h2><p>with Jordan Lee · Demo record</p></div></div>
          <label>Meeting type</label>
          <div class="choices"><div class="choice selected">◉ Video (Zoom)</div><div class="choice">☎ Phone</div><div class="choice">⌖ In person</div></div>
          <div class="fields"><div><label>Date</label><div class="input">November 18, 2026</div></div><div><label>Time</label><div class="input">10:30 AM⌄</div></div></div>
          <button class="wide">▦ &nbsp; Schedule consultation</button>
          <p class="link">Prefer the client picks? Send them your booking link</p>
        </div>
      </div>`,
  },
  {
    file: '04-meeting-created.png',
    eyebrow: 'AUTOMATIC MEETING DETAILS',
    title: 'Meeting created. Client notified.',
    subtitle: 'The consultation is confirmed and the Zoom join link is ready to open or share.',
    screen: `
      <div class="page">
        <div class="topbar"><div class="wordmark"><span class="shield">⚖</span> ClearCase<span>IQ</span></div><div class="crumb">Demo matter / Consultations</div><div class="avatar">AR</div></div>
        <div class="modal success-modal">
          <div class="check">✓</div>
          <h2>Consultation scheduled</h2>
          <p>Jordan Lee has been emailed the details and a join link.</p>
          <div class="meeting-ticket">
            <div><span>VIDEO CONSULTATION</span><strong>Wednesday, Nov 18 · 10:30 AM</strong></div>
            <div class="duration">30 min</div>
          </div>
          <button class="wide">▶ &nbsp; Open meeting link</button>
          <div class="security">Meeting details are linked to this demo matter.</div>
        </div>
      </div>`,
  },
  {
    file: '05-start-video-call.png',
    eyebrow: 'ONE-CLICK CALLS',
    title: 'Start a Zoom call from any case',
    subtitle: 'Launch an immediate client call without leaving the matter workspace.',
    screen: `
      <div class="page">
        <div class="topbar"><div class="wordmark"><span class="shield">⚖</span> ClearCase<span>IQ</span></div><div class="crumb">Active cases</div><div class="avatar">AR</div></div>
        <div class="content">
          <div class="case-head"><div><span class="demo">DEMO MATTER</span><h2>Jordan Lee</h2><p>Motor vehicle collision · Active</p></div><button>▻ &nbsp; Start video call</button></div>
          <div class="stats"><div><span>Next deadline</span><strong>Dec 14</strong></div><div><span>Open tasks</span><strong>4</strong></div><div><span>Last contact</span><strong>Today</strong></div></div>
          <div class="timeline"><h3>Matter activity</h3><div class="event"><i></i><div><strong>Client documents received</strong><p>Medical records added to the matter.</p></div><small>9:42 AM</small></div><div class="event"><i></i><div><strong>Consultation requested</strong><p>Client is ready for a video call.</p></div><small>9:18 AM</small></div></div>
          <div class="toast">✓ Zoom meeting created · Join link sent to the client</div>
        </div>
      </div>`,
  },
  {
    file: '06-client-join.png',
    eyebrow: 'A SIMPLE CLIENT EXPERIENCE',
    title: 'Clients get a clear Join button',
    subtitle: 'Meeting details appear in the secure client portal so the right person gets the right link.',
    screen: `
      <div class="page portal">
        <div class="topbar"><div class="wordmark"><span class="shield">⚖</span> ClearCase<span>IQ</span></div><div class="crumb">Client portal · Demo</div><div class="avatar">JL</div></div>
        <div class="content">
          <div class="welcome"><span>UPCOMING CONSULTATION</span><h2>Your video consultation is confirmed</h2><p>Join from this page when it is time for your meeting.</p></div>
          <div class="join-card">
            <div class="datebox"><strong>18</strong><span>NOV</span></div>
            <div class="grow"><h3>Video consultation</h3><p>Wednesday at 10:30 AM · 30 minutes</p><span class="with">With your attorney</span></div>
            <button>▶ &nbsp; Join Zoom meeting</button>
          </div>
          <div class="notice">🔒 Your meeting link is available only in your secure portal and notification.</div>
        </div>
      </div>`,
  },
]

const css = `
  *{box-sizing:border-box}html,body{margin:0;width:1200px;height:780px;overflow:hidden;font-family:Inter,"Segoe UI",Arial,sans-serif;color:#10213d}
  body{background:linear-gradient(135deg,#071a35 0%,#0a2c58 48%,#0f5f8c 100%);position:relative}
  body:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 84% 20%,rgba(245,158,11,.24),transparent 27%),radial-gradient(circle at 7% 90%,rgba(14,165,233,.18),transparent 30%)}
  .frame{position:relative;width:1200px;height:780px;padding:52px 64px}
  .copy{height:174px;color:white;max-width:980px}
  .eyebrow{font-size:14px;font-weight:800;letter-spacing:2.2px;color:#fbbf24;margin-bottom:12px}
  h1{font-size:42px;line-height:1.05;margin:0 0 12px;letter-spacing:-1.3px}.copy p{margin:0;color:#d8e8f7;font-size:19px;line-height:1.45}
  .browser{height:494px;border-radius:18px;overflow:hidden;background:#eef4f8;box-shadow:0 28px 70px rgba(0,0,0,.33);border:1px solid rgba(255,255,255,.25)}
  .chrome{height:36px;background:#e6ebf0;display:flex;align-items:center;gap:7px;padding:0 14px}.dot{width:9px;height:9px;border-radius:50%}.red{background:#fa7d72}.yellow{background:#f5c04c}.green{background:#5cc98a}
  .url{margin-left:18px;height:20px;width:420px;border-radius:9px;background:#f8fafc;color:#7a8798;font-size:10px;padding:4px 13px}
  .page{height:458px;background:#f8fafc}.topbar{height:62px;background:white;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;padding:0 34px;gap:28px}
  .wordmark{font-size:21px;font-weight:800;letter-spacing:-.6px}.wordmark>span:last-child{color:#f59e0b}.shield{display:inline-flex;width:29px;height:31px;align-items:center;justify-content:center;color:#fbbf24;background:#0b2b55;clip-path:polygon(50% 0,92% 18%,87% 73%,50% 100%,13% 73%,8% 18%);font-size:14px;margin-right:8px}
  .crumb{font-size:12px;color:#64748b;flex:1}.avatar{margin-left:auto;width:32px;height:32px;border-radius:50%;background:#dbeafe;color:#174b86;font-size:11px;font-weight:800;display:grid;place-items:center}
  .content{padding:28px 44px}.center-card{width:600px;margin:55px auto;background:white;border:1px solid #dce5ed;border-radius:16px;padding:28px 34px;box-shadow:0 12px 35px rgba(15,23,42,.08)}
  .center-card h2,.modal h2,.section-head h2,.case-head h2,.welcome h2{margin:0;font-size:21px}.center-card p,.section-head p,.case-head p,.welcome p{font-size:13px;color:#64748b;line-height:1.55}.icon{float:left;margin-right:12px}.blue{color:#2386d9}.security{font-size:11px;color:#64748b;text-align:center;margin-top:17px}
  button{border:0;border-radius:9px;background:#0c5fa8;color:white;padding:10px 17px;font-size:12px;font-weight:700}.center-card button{margin-top:8px}
  .section-head{margin-bottom:18px}.settings-card{background:white;border:1px solid #dce5ed;border-radius:14px;padding:22px 25px;max-width:760px}.row{display:flex;align-items:center;gap:15px}.grow{flex:1}.row h3,.join-card h3{margin:0 0 4px;font-size:15px}.row p,.join-card p{margin:0;color:#64748b;font-size:12px}.zoom-logo{width:40px;height:40px;border-radius:10px;background:#2d8cff;color:white;font-weight:900;display:grid;place-items:center}.status{padding:6px 10px;border-radius:20px;background:#dcfce7;color:#16834b;font-size:11px;font-weight:800}.divider{height:1px;background:#e2e8f0;margin:17px 0}.muted{font-size:12px;color:#64748b}.actions{display:flex;gap:9px;margin-top:14px}.secondary{background:white;color:#475569;border:1px solid #cbd5e1}
  .modal{width:585px;margin:23px auto;background:white;border:1px solid #dce5ed;border-radius:16px;padding:23px 27px;box-shadow:0 16px 44px rgba(15,23,42,.16)}.modal-title{display:flex;align-items:center;gap:12px;margin-bottom:18px}.modal-title p{margin:3px 0 0;font-size:11px;color:#64748b}.calendar{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#e0f2fe;color:#0870b7;font-size:20px}.modal label{display:block;font-size:10px;font-weight:800;color:#64748b;margin-bottom:7px}.choices{display:flex;gap:8px}.choice{flex:1;border:1px solid #d8e0e8;border-radius:8px;padding:9px;text-align:center;font-size:11px;font-weight:700;color:#64748b}.choice.selected{border-color:#1c75bc;background:#eff8ff;color:#0c5fa8}.fields{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin:16px 0}.input{border:1px solid #d8e0e8;border-radius:8px;padding:10px 12px;font-size:11px;color:#334155}.wide{width:100%;padding:11px}.link{text-align:center;color:#0c5fa8;font-size:11px;font-weight:700;margin:13px 0 0}
  .success-modal{text-align:center;padding-top:30px}.check{margin:0 auto 12px;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#dcfce7;color:#16a163;font-size:25px;font-weight:900}.success-modal>p{font-size:12px;color:#64748b}.meeting-ticket{margin:20px 0;border:1px solid #dbe4ec;background:#f8fafc;border-radius:11px;padding:14px 16px;display:flex;text-align:left;align-items:center}.meeting-ticket span{display:block;color:#0c5fa8;font-weight:800;font-size:9px;letter-spacing:1px}.meeting-ticket strong{font-size:12px}.duration{margin-left:auto;color:#64748b;font-size:11px}
  .case-head{display:flex;align-items:center;background:white;border:1px solid #dce5ed;padding:19px 22px;border-radius:13px}.case-head>div{flex:1}.case-head h2{margin-top:5px}.case-head p{margin:3px 0 0}.demo,.welcome>span{font-size:9px;color:#0c6db6;font-weight:900;letter-spacing:1.3px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}.stats>div{background:white;border:1px solid #e2e8f0;border-radius:11px;padding:13px 16px}.stats span{display:block;color:#64748b;font-size:10px}.stats strong{font-size:16px}.timeline{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px}.timeline h3{font-size:13px;margin:0 0 10px}.event{display:flex;gap:11px;align-items:center;border-top:1px solid #edf2f6;padding:9px 0;font-size:10px}.event i{width:8px;height:8px;background:#38bdf8;border-radius:50%}.event div{flex:1}.event p{margin:2px 0;color:#64748b}.event small{color:#94a3b8}.toast{position:absolute;right:78px;bottom:35px;background:#063963;color:white;border-radius:10px;padding:12px 18px;font-size:11px;box-shadow:0 10px 25px rgba(15,23,42,.25)}
  .welcome{background:linear-gradient(110deg,#eaf7ff,#fff8e8);padding:20px 25px;border-radius:13px;margin-bottom:18px}.welcome p{margin:6px 0 0}.join-card{display:flex;align-items:center;gap:17px;background:white;border:1px solid #dce5ed;border-radius:14px;padding:20px 23px}.datebox{width:55px;height:59px;border-radius:10px;background:#eaf4ff;display:grid;place-content:center;text-align:center;color:#0c5fa8}.datebox strong{font-size:22px;line-height:1}.datebox span{font-size:9px;font-weight:900}.with{display:inline-block;margin-top:7px;padding:4px 8px;background:#eef2f7;color:#475569;border-radius:12px;font-size:9px}.notice{margin-top:15px;text-align:center;color:#64748b;font-size:11px}
`

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1200, height: 780 }, deviceScaleFactor: 1 })

for (const scene of scenes) {
  await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>
    <main class="frame">
      <section class="copy"><div class="eyebrow">${scene.eyebrow}</div><h1>${scene.title}</h1><p>${scene.subtitle}</p></section>
      <section class="browser"><div class="chrome"><i class="dot red"></i><i class="dot yellow"></i><i class="dot green"></i><div class="url">clearcaseiq.com · Secure attorney workspace</div></div>${scene.screen}</section>
    </main>
  </body></html>`)
  await page.screenshot({ path: path.join(outputDir, scene.file), type: 'png' })
}

await browser.close()
console.log(`Generated ${scenes.length} Zoom Marketplace gallery images in ${outputDir}`)
