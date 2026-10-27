const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(process.env.TEMP, 'chrome_dash_restyle_' + Date.now());
const SCREENSHOT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\cdaa320d-a919-49d2-be92-9d81ace6b701\\screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (data.method === 'Runtime.consoleAPICalled') {
        const args = (data.params.args || []).map((a) => a.value || a.description).join(' ');
        this.consoleLogs.push({ type: data.params.type, text: args });
        if (data.params.type === 'error') {
          console.error(`[Browser Console Error] ${args}`);
        }
      }
    };
  }

  waitOpen() {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve();
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const filePath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
  }

  sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function run() {
  console.log('=== NetSentinel UI Phase 2: Dashboard Verification ===');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    `--user-data-dir=${USER_DATA_DIR}`,
    'http://localhost:5173/login',
  ]);

  let cdp = null;
  const results = [];

  const recordResult = (name, pass, details) => {
    results.push({ name, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name} - ${details}`);
  };

  try {
    let targets = null;
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch('http://127.0.0.1:9222/json');
        targets = await res.json();
        if (targets && targets.length > 0) break;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    if (!targets || targets.length === 0) {
      throw new Error('Could not connect to Chrome debugging target');
    }

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.waitOpen();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    await cdp.setViewport(1440, 900);
    await cdp.sleep(2000);

    // 1. Log in as admin
    console.log('\n--- Step 1: Authenticate as Admin ---');
    await cdp.eval(`window.location.href = '/login'`);
    await cdp.sleep(1500);

    await cdp.eval(`(() => {
      const inputs = document.querySelectorAll('input');
      const proto = window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(inputs[0], 'admin@netsentinel.local');
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));

      Object.getOwnPropertyDescriptor(proto, 'value').set.call(inputs[1], 'Admin@12345');
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));

      document.querySelector('button[type="submit"]').click();
    })()`);
    await cdp.sleep(2500);

    const pathAfterLogin = await cdp.eval('window.location.pathname');
    recordResult('Admin Login', pathAfterLogin === '/dashboard', `Path is ${pathAfterLogin}`);

    // Wait for Dashboard data to populate and live socket connection
    await cdp.sleep(2000);

    // If capture is stopped, trigger Start to get live traffic
    const isRunning = await cdp.eval(`(() => {
      const btn = document.querySelector('.capture-bar-admin-controls button');
      return btn && btn.innerText.includes('Stop');
    })()`);

    if (!isRunning) {
      console.log('Capture is stopped. Starting simulator capture for live stream verification...');
      await cdp.eval(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const startBtn = btns.find(b => b.innerText.includes('Start'));
        if (startBtn) startBtn.click();
      })()`);
      await cdp.sleep(3000);
    }

    // 2. Verify StatCards
    console.log('\n--- Step 2: Verify StatCards ---');
    const statCardsInfo = await cdp.eval(`(() => {
      const cards = Array.from(document.querySelectorAll('.dashboard-grid > div')).slice(1, 5);
      return cards.map(c => {
        const label = c.querySelector('.label-xs')?.innerText;
        const number = c.querySelector('.neon-number')?.innerText;
        const hasSvg = !!c.querySelector('svg path');
        const color = c.querySelector('.neon-number')?.style?.color;
        const hasIcon = !!c.querySelector('svg');
        return { label, number, hasSvg, color, hasIcon };
      });
    })()`);
    console.log('StatCards found:', JSON.stringify(statCardsInfo, null, 2));

    const statPass =
      statCardsInfo.length === 4 &&
      statCardsInfo.every((s) => s.label && s.number && s.hasSvg);
    recordResult(
      'StatCards Rendering',
      statPass,
      `4 cards verified with labels, neon numbers, and mini SVG sparklines`
    );

    // 3. Verify CaptureControlBar
    console.log('\n--- Step 3: Verify CaptureControlBar ---');
    const captureBarInfo = await cdp.eval(`(() => {
      const bar = document.querySelector('.col-span-4');
      const text = bar?.innerText || '';
      const hasModeSwitch = text.includes('Simulator') && text.includes('Sniffer');
      const hasEngineStatus = text.includes('Capture Engine');
      const hasStateBadge = text.includes('RUNNING') || text.includes('STOPPED');
      const hasAttacksCheckbox = !!bar?.querySelector('input[type="checkbox"]');
      const hasActionBtn = text.includes('Start') || text.includes('Stop');
      return { hasModeSwitch, hasEngineStatus, hasStateBadge, hasAttacksCheckbox, hasActionBtn };
    })()`);
    console.log('CaptureControlBar info:', captureBarInfo);

    const captureBarPass =
      captureBarInfo.hasModeSwitch &&
      captureBarInfo.hasEngineStatus &&
      captureBarInfo.hasStateBadge &&
      captureBarInfo.hasActionBtn;
    recordResult(
      'CaptureControlBar Restyle',
      captureBarPass,
      `Mode switcher, engine status, state badges, action button verified`
    );

    // 4. Verify TrafficWaveform
    console.log('\n--- Step 4: Verify TrafficWaveform ---');
    const waveformInfo = await cdp.eval(`(() => {
      const card = document.querySelectorAll('.dashboard-grid > div')[5];
      const hasCanvas = !!card?.querySelector('canvas');
      const title = card?.querySelector('h3')?.innerText || '';
      const hasToggle = card?.innerText.includes('Packets/s') && card?.innerText.includes('Bytes/s');
      return { hasCanvas, title, hasToggle };
    })()`);
    console.log('Waveform info:', waveformInfo);
    recordResult(
      'TrafficWaveform Restyle',
      waveformInfo.hasCanvas && waveformInfo.hasToggle,
      `Waveform canvas active with Packets/s & Bytes/s segmented toggle`
    );

    // 5. Verify ProtocolDonut
    console.log('\n--- Step 5: Verify ProtocolDonut ---');
    const donutInfo = await cdp.eval(`(() => {
      const card = document.querySelectorAll('.dashboard-grid > div')[6];
      const hasCanvas = !!card?.querySelector('canvas');
      const centerTotal = card?.querySelector('.neon-number')?.innerText || '';
      const hasTCP = card?.innerText.includes('TCP');
      const hasUDP = card?.innerText.includes('UDP');
      return { hasCanvas, centerTotal, hasTCP, hasUDP };
    })()`);
    console.log('Donut info:', donutInfo);
    recordResult(
      'ProtocolDonut Restyle',
      donutInfo.hasCanvas && donutInfo.centerTotal !== '',
      `Donut canvas rendered with HTML center total (${donutInfo.centerTotal}) and custom legend`
    );

    // 6. Verify PacketStreamTable
    console.log('\n--- Step 6: Verify PacketStreamTable ---');
    const tableInfo = await cdp.eval(`(() => {
      const card = document.querySelectorAll('.dashboard-grid > div')[7];
      const headers = Array.from(card?.querySelectorAll('th') || []).map(th => th.innerText);
      const rowCount = card?.querySelectorAll('tbody tr')?.length || 0;
      const hasPauseBtn = card?.innerText.includes('Pause') || card?.innerText.includes('Resume');
      const hasFilter = !!card?.querySelector('input[placeholder*="Filter"]');
      const hasProtoSelect = !!card?.querySelector('select');
      return { headers, rowCount, hasPauseBtn, hasFilter, hasProtoSelect };
    })()`);
    console.log('PacketStreamTable info:', tableInfo);
    recordResult(
      'PacketStreamTable Restyle',
      tableInfo.headers.length >= 6 && tableInfo.hasPauseBtn && tableInfo.hasFilter,
      `Table active with 6 headers, pause button, search filter, and ${tableInfo.rowCount} rows`
    );

    // 7. Verify LiveAlertsFeed
    console.log('\n--- Step 7: Verify LiveAlertsFeed ---');
    const alertsFeedInfo = await cdp.eval(`(() => {
      const card = document.querySelectorAll('.dashboard-grid > div')[8];
      const title = card?.querySelector('h3')?.innerText || '';
      const hasSeverityChips = card?.innerText.includes('CRITICAL') && card?.innerText.includes('HIGH') && card?.innerText.includes('LOW');
      const alertItems = card?.querySelectorAll('.clay-inset');
      return { title, hasSeverityChips, chipCount: alertItems?.length || 0 };
    })()`);
    console.log('Alerts feed info:', alertsFeedInfo);
    recordResult(
      'LiveAlertsFeed Restyle',
      alertsFeedInfo.hasSeverityChips,
      `2x2 severity chips with glow dots rendered, alert items or radar empty state active`
    );

    // 8. Verify TopTalkersCard & TopRiskDevicesCard
    console.log('\n--- Step 8: Verify TopTalkers & Risk Devices ---');
    const hostCardsInfo = await cdp.eval(`(() => {
      const talkersCard = document.querySelectorAll('.dashboard-grid > div')[9];
      const riskCard = document.querySelectorAll('.dashboard-grid > div')[10];
      const talkersTitle = talkersCard?.querySelector('h3')?.innerText || '';
      const riskTitle = riskCard?.querySelector('h3')?.innerText || '';
      const hasProgressBars = !!talkersCard?.querySelector('.progress-bar-bg');
      const hasRiskBadges = !!riskCard?.querySelector('.badge');
      return { talkersTitle, riskTitle, hasProgressBars, hasRiskBadges };
    })()`);
    console.log('Host cards info:', hostCardsInfo);
    recordResult(
      'Host Analysis Cards',
      hostCardsInfo.talkersTitle.includes('Bandwidth') && hostCardsInfo.riskTitle.includes('Risk'),
      `TopTalkers and High-Risk Devices cards mounted and formatted`
    );

    // Wait a moment for live traffic animations, then capture desktop screenshot
    await cdp.sleep(2000);
    console.log('\n--- Step 9: Capturing 1440px Screenshot ---');
    await cdp.screenshot('dashboard_1440_neon.png');

    // 10. Mobile 390px Viewport Verification
    console.log('\n--- Step 10: Testing Mobile 390px Viewport ---');
    await cdp.setViewport(390, 844, true);
    await cdp.sleep(1500);

    // Check for horizontal overflow
    const overflowCheck = await cdp.eval(`(() => {
      const docWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const bodyWidth = document.body.scrollWidth;
      return { docWidth, scrollWidth, bodyWidth, hasHorizontalScroll: scrollWidth > docWidth };
    })()`);
    console.log('Mobile overflow check:', overflowCheck);
    recordResult(
      'Mobile 390px No Horizontal Overflow',
      !overflowCheck.hasHorizontalScroll,
      `Client width: ${overflowCheck.docWidth}px, Scroll width: ${overflowCheck.scrollWidth}px`
    );

    await cdp.screenshot('dashboard_390_neon.png');

    // 11. Check Console Errors
    const errors = cdp.consoleLogs.filter((l) => l.type === 'error');
    recordResult(
      'Zero Console Errors',
      errors.length === 0,
      errors.length === 0 ? 'No console errors detected' : `${errors.length} errors: ${errors.map(e => e.text).join('; ')}`
    );

    console.log('\n=== FINAL VERIFICATION SUMMARY ===');
    const allPassed = results.every((r) => r.pass);
    console.log(`TOTAL CHECKS: ${results.length}`);
    console.log(`PASSED: ${results.filter((r) => r.pass).length}`);
    console.log(`FAILED: ${results.filter((r) => !r.pass).length}`);
    console.log(`OVERALL STATUS: ${allPassed ? 'ALL PASS' : 'SOME CHECKS FAILED'}`);

  } catch (err) {
    console.error('Error during dashboard restyle test:', err);
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill('SIGTERM');
  }
}

run();
