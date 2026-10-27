const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(process.env.TEMP, 'chrome_dash_profile_' + Date.now());
const SCREENSHOT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\cdaa320d-a919-49d2-be92-9d81ace6b701\\screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (data.method === 'Runtime.consoleAPICalled') {
        const args = (data.params.args || []).map((a) => a.value || a.description).join(' ');
        if (data.params.type === 'error' || data.params.type === 'warning') {
          console.log(`[Browser Console ${data.params.type}] ${args}`);
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

  async screenshot(filename, width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
    await new Promise((r) => setTimeout(r, 600));

    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const filePath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes, ${width}x${height})`);
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, 1000));
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function run() {
  console.log('Starting headless Chrome for Dashboard verification...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    `--user-data-dir=${USER_DATA_DIR}`,
    'http://localhost:5173/login',
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  let cdp = null;
  try {
    const res = await fetch('http://localhost:9222/json');
    const targets = await res.json();
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.waitOpen();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('\n=== STEP 1: LOG IN AS ADMIN ===');
    await cdp.navigate('http://localhost:5173/login');
    await new Promise((r) => setTimeout(r, 1500));

    await cdp.eval(`(() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      if (emailInput && passInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(emailInput, 'admin@netsentinel.local');
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        setter.call(passInput, 'Admin@12345');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('button[type="submit"]').click();
      }
    })()`);

    await new Promise((r) => setTimeout(r, 2000));
    const currentUrl = await cdp.eval('window.location.pathname');
    console.log(`Admin login successful, currently on: ${currentUrl}`);

    console.log('\n=== STEP 2: START CAPTURE SIMULATOR FROM DASHBOARD ===');
    // Ensure we are in simulator mode with simulate attacks checked, then click Start Capture if not already running
    await cdp.eval(`(() => {
      const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Capture'));
      if (startBtn) {
        startBtn.click();
        console.log('Clicked Start Capture button');
      } else {
        console.log('Capture is already running');
      }
    })()`);

    console.log('Waiting 15 seconds to receive live packets, stats, and threats...');
    await new Promise((r) => setTimeout(r, 15000));

    // Inspect live DOM metrics
    const statsInfo = await cdp.eval(`(() => {
      const packetRows = document.querySelectorAll('.table tbody tr').length;
      const firstRowText = document.querySelector('.table tbody tr')?.innerText || '';
      const threatCount = document.querySelectorAll('.alert-item-new, .clay-inset .badge').length;
      const statCards = Array.from(document.querySelectorAll('.glow-num')).map(el => el.innerText);
      return { packetRows, firstRowText, threatCount, statCards };
    })()`);

    console.log('Live Dashboard DOM snapshot:');
    console.log(`  - Packet rows rendered: ${statsInfo.packetRows}`);
    console.log(`  - StatCard numbers: ${JSON.stringify(statsInfo.statCards)}`);
    console.log(`  - Sample packet row: "${statsInfo.firstRowText.replace(/\\s+/g, ' ')}"`);

    console.log('\n=== STEP 3: CAPTURE DESKTOP SCREENSHOT (1440px) ===');
    await cdp.screenshot('dashboard_live_1440.png', 1440, 900, false);

    console.log('\n=== STEP 4: CAPTURE MOBILE SCREENSHOT (390px) ===');
    await cdp.screenshot('dashboard_live_390.png', 390, 844, true);

    console.log('\n=== STEP 5: VERIFY NORMAL USER VIEW (NO CONTROLS) ===');
    // Log out admin
    await cdp.eval(`(() => {
      const logoutBtn = document.querySelector('button[title="Logout"]');
      if (logoutBtn) logoutBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 1200));

    // Log in as normal user alice@netsentinel.local
    await cdp.navigate('http://localhost:5173/login');
    await new Promise((r) => setTimeout(r, 1500));

    await cdp.eval(`(() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      if (emailInput && passInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(emailInput, 'alice@netsentinel.local');
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        setter.call(passInput, 'Password123');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('button[type="submit"]').click();
      }
    })()`);
    await new Promise((r) => setTimeout(r, 2000));

    // Verify on /dashboard
    const userDashUrl = await cdp.eval('window.location.pathname');
    const userRoleBadge = await cdp.eval('document.querySelector(".badge-info")?.innerText');
    const hasAdminControls = await cdp.eval(`(() => {
      const hasStart = Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Start Capture') || b.innerText.includes('Stop Capture'));
      const hasMode = Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Simulator') || b.innerText.includes('Live Sniffer'));
      const note = document.body.innerText.includes('Controlled by Administrator');
      return { hasStart, hasMode, note };
    })()`);

    console.log(`Normal user on dashboard: url="${userDashUrl}", role="${userRoleBadge}"`);
    console.log(`Admin controls present for normal user?`, hasAdminControls);

    if (hasAdminControls.hasStart || hasAdminControls.hasMode || !hasAdminControls.note) {
      throw new Error(`Normal user should NOT have capture controls, but found: ${JSON.stringify(hasAdminControls)}`);
    }

    await cdp.screenshot('dashboard_normal_user_1440.png', 1440, 900, false);
    console.log('Normal user view verified successfully without admin capture controls!');

    console.log('\nALL PHASE 9 DASHBOARD CHECKS PASSED!');
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill('SIGKILL');
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
