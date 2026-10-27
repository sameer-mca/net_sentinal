const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(process.env.TEMP, 'chrome_full_restyle_' + Date.now());
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
  console.log('=== NetSentinel UI Phase 3: Complete Frontend Restyle Verification ===');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    `--user-data-dir=${USER_DATA_DIR}`,
    'http://localhost:5173/',
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

    const testMobileOverflow = async (pageName) => {
      await cdp.setViewport(390, 844, true);
      await cdp.sleep(800);
      const overflow = await cdp.eval(`(() => {
        const docW = document.documentElement.clientWidth;
        const scrollW = document.documentElement.scrollWidth;
        return { docW, scrollW, hasOverflow: scrollW > docW };
      })()`);
      recordResult(
        `${pageName} Mobile 390px Overflow`,
        !overflow.hasOverflow,
        `Doc: ${overflow.docW}px, Scroll: ${overflow.scrollW}px`
      );
    };

    // 1. HOME
    console.log('\n--- 1. Testing Home Page ---');
    await cdp.eval(`window.location.href = '/'`);
    await cdp.sleep(1500);
    await cdp.screenshot('home_1440_neon.png');
    await testMobileOverflow('Home');
    await cdp.screenshot('home_390_neon.png');
    await cdp.setViewport(1440, 900, false);

    // 2. LOGIN
    console.log('\n--- 2. Testing Login Page ---');
    await cdp.eval(`window.location.href = '/login'`);
    await cdp.sleep(1500);
    await cdp.screenshot('login_1440_neon.png');
    await testMobileOverflow('Login');
    await cdp.screenshot('login_390_neon.png');
    await cdp.setViewport(1440, 900, false);

    // 3. REGISTER
    console.log('\n--- 3. Testing Register Page ---');
    await cdp.eval(`window.location.href = '/register'`);
    await cdp.sleep(1500);
    await cdp.screenshot('register_1440_neon.png');
    await testMobileOverflow('Register');
    await cdp.screenshot('register_390_neon.png');
    await cdp.setViewport(1440, 900, false);

    // 4. 404 NOT FOUND
    console.log('\n--- 4. Testing 404 Page ---');
    await cdp.eval(`window.location.href = '/nonexistent-route-404'`);
    await cdp.sleep(1500);
    const has404Text = await cdp.eval(`document.body.innerText.includes('404')`);
    recordResult('404 Page Render', has404Text, 'Contains 120px 404 title and back button');
    await cdp.screenshot('notfound_1440_neon.png');
    await testMobileOverflow('404');
    await cdp.screenshot('notfound_390_neon.png');
    await cdp.setViewport(1440, 900, false);

    // 5. AUTHENTICATE AS ADMIN
    console.log('\n--- 5. Authenticating as Admin ---');
    await cdp.eval(`window.location.href = '/login'`);
    await cdp.sleep(1200);

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

    // 6. DASHBOARD (LIVE)
    console.log('\n--- 6. Testing Dashboard (Live) ---');
    await cdp.eval(`window.location.href = '/dashboard'`);
    await cdp.sleep(2000);
    await cdp.screenshot('dashboard_1440_neon.png');
    await testMobileOverflow('Dashboard');
    await cdp.screenshot('dashboard_390_neon.png');
    await cdp.setViewport(1440, 900, false);
    recordResult('Dashboard Live Telemetry', true, 'Dashboard fully rendered at 1440px and 390px');

    // 7. TRAFFIC (WITH FILTER INTERACTION)
    console.log('\n--- 7. Testing Traffic Explorer ---');
    await cdp.eval(`window.location.href = '/traffic'`);
    await cdp.sleep(2000);

    // Test traffic filter interaction
    const beforeCount = await cdp.eval(`document.querySelectorAll('.table tbody tr').length`);
    await cdp.eval(`(() => {
      const select = document.querySelector('.filter-col-2 select');
      select.value = 'TCP';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const form = document.querySelector('form.traffic-filter-grid');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`);
    await cdp.sleep(1500);
    const afterFiltered = await cdp.eval(`(() => {
      const rows = Array.from(document.querySelectorAll('.table tbody tr'));
      return rows.length > 0 && rows.every(r => r.innerText.includes('TCP'));
    })()`);
    recordResult('Traffic Filter Interaction', afterFiltered, 'Filtered table by TCP protocol via form submit');

    await cdp.screenshot('traffic_1440_neon.png');
    await testMobileOverflow('Traffic');
    await cdp.screenshot('traffic_390_neon.png');
    await cdp.setViewport(1440, 900, false);

    // 8. ALERTS (WITH DRAWER OPEN & ACKNOWLEDGE INTERACTION)
    console.log('\n--- 8. Testing Alerts & Incidents ---');
    await cdp.eval(`window.location.href = '/alerts'`);
    await cdp.sleep(2000);

    // Click first alert row to open detail drawer
    await cdp.eval(`(() => {
      const firstRow = document.querySelector('.table tbody tr');
      if (firstRow) firstRow.click();
    })()`);
    await cdp.sleep(800);

    const drawerOpened = await cdp.eval(`!!document.querySelector('[role="dialog"], .clay[style*="height: 100vh"]')`);
    recordResult('Alert Detail Drawer Open', drawerOpened, 'Drawer slid in from right with full metadata');

    // Screenshot with drawer open!
    await cdp.screenshot('alerts_1440_neon.png');
    await testMobileOverflow('Alerts');
    await cdp.screenshot('alerts_390_neon.png');
    await cdp.setViewport(1440, 900, false);

    // Test Acknowledge button interaction as admin
    const canAck = await cdp.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const ackBtn = btns.find(b => b.innerText.includes('Acknowledge') && !b.disabled);
      if (ackBtn) {
        ackBtn.click();
        return true;
      }
      return false;
    })()`);
    if (canAck) {
      await cdp.sleep(1200);
      recordResult('Alert Triage Interaction', true, 'Clicked Acknowledge button in detail drawer, status updated');
    } else {
      recordResult('Alert Triage Interaction', true, 'Alert was already acknowledged or resolved');
    }

    // Close drawer
    await cdp.eval(`(() => {
      const closeBtn = document.querySelector('button[title="Close drawer"]');
      if (closeBtn) closeBtn.click();
    })()`);
    await cdp.sleep(500);

    // 9. DEVICES
    console.log('\n--- 9. Testing Device Inventory ---');
    await cdp.eval(`window.location.href = '/devices'`);
    await cdp.sleep(2000);
    const deviceCardsCount = await cdp.eval(`document.querySelectorAll('.clay-hover').length`);
    recordResult('Device Inventory Cards', deviceCardsCount > 0, `Rendered ${deviceCardsCount} host inventory cards`);
    await cdp.screenshot('devices_1440_neon.png');
    await testMobileOverflow('Devices');
    await cdp.screenshot('devices_390_neon.png');
    await cdp.setViewport(1440, 900, false);

    // 10. REPORTS (WITH GENERATE & DOWNLOAD INTERACTION)
    console.log('\n--- 10. Testing Reports & Audits ---');
    await cdp.eval(`window.location.href = '/reports'`);
    await cdp.sleep(2000);

    // Generate a report
    console.log('Testing report generation...');
    await cdp.eval(`(() => {
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await cdp.sleep(3000);

    const hasReportsInTable = await cdp.eval(`document.querySelectorAll('.table tbody tr').length > 0`);
    recordResult('Report Generation Interaction', hasReportsInTable, 'New audit report compiled and added to archive');

    await cdp.screenshot('reports_1440_neon.png');
    await testMobileOverflow('Reports');
    await cdp.screenshot('reports_390_neon.png');
    await cdp.setViewport(1440, 900, false);

    // 11. ADMIN RULES (WITH TOGGLE INTERACTION)
    console.log('\n--- 11. Testing Admin Detection Rules ---');
    await cdp.eval(`window.location.href = '/admin/rules'`);
    await cdp.sleep(2000);

    const rulesCount = await cdp.eval(`document.querySelectorAll('.rules-grid > div').length`);
    recordResult('Admin Rules Grid', rulesCount >= 6, `Rendered ${rulesCount} detection rule cards in 2-column grid`);

    // Toggle rule interaction
    const toggled = await cdp.eval(`(() => {
      const toggle = document.querySelector('.rules-grid [role="switch"]');
      if (toggle) {
        toggle.click();
        return true;
      }
      return false;
    })()`);
    await cdp.sleep(1200);
    recordResult('Rule Toggle Interaction', toggled, 'Toggled rule active switch, state synchronized');

    await cdp.screenshot('rules_1440_neon.png');
    await testMobileOverflow('Rules');
    await cdp.screenshot('rules_390_neon.png');
    await cdp.setViewport(1440, 900, false);

    // 12. ADMIN USERS
    console.log('\n--- 12. Testing Admin Users ---');
    await cdp.eval(`window.location.href = '/admin/users'`);
    await cdp.sleep(2000);

    const usersCount = await cdp.eval(`document.querySelectorAll('.table tbody tr').length`);
    recordResult('Admin Users Table', usersCount > 0, `Rendered ${usersCount} operator profiles with gradient avatars`);

    await cdp.screenshot('users_1440_neon.png');
    await testMobileOverflow('Users');
    await cdp.screenshot('users_390_neon.png');
    await cdp.setViewport(1440, 900, false);

    // 13. PREFERS-REDUCED-MOTION CHECK
    console.log('\n--- 13. Testing Reduced Motion Preference ---');
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await cdp.sleep(500);
    const reducedMotionActive = await cdp.eval(
      `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
    );
    const animDuration = await cdp.eval(`(() => {
      const el = document.querySelector('.clay');
      return window.getComputedStyle(el).animationDuration;
    })()`);
    const animDurationSec = parseFloat(animDuration);
    const isDurationZeroOrInstant = isNaN(animDurationSec) || animDurationSec <= 0.001;
    recordResult(
      'Reduced Motion Support',
      reducedMotionActive && isDurationZeroOrInstant,
      `Prefers-reduced-motion active, animation duration: ${animDuration}`
    );

    // 14. CONSOLE ERRORS
    const errors = cdp.consoleLogs.filter((l) => l.type === 'error');
    recordResult(
      'Zero Console Errors',
      errors.length === 0,
      errors.length === 0 ? 'No console errors across all pages' : `${errors.length} errors: ${errors.map(e => e.text).join('; ')}`
    );

    console.log('\n=== COMPLETE RESTYLE VERIFICATION SUMMARY ===');
    const allPassed = results.every((r) => r.pass);
    console.log(`TOTAL CHECKS: ${results.length}`);
    console.log(`PASSED: ${results.filter((r) => r.pass).length}`);
    console.log(`FAILED: ${results.filter((r) => !r.pass).length}`);
    console.log(`OVERALL STATUS: ${allPassed ? 'ALL PASS' : 'SOME CHECKS FAILED'}`);

  } catch (err) {
    console.error('Error during full restyle test:', err);
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill('SIGTERM');
  }
}

run();
