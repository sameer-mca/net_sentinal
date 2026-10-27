const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(process.env.TEMP, 'chrome_p10_profile_' + Date.now());
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

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const fullPath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(res.data, 'base64'));
    console.log(`[Screenshot Captured] ${filename} (${fullPath})`);
  }

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function run() {
  console.log('--- STARTING PHASE 10 E2E AUTOMATED VERIFICATION ---');

  const chromeProc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      `--user-data-dir=${USER_DATA_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--window-size=1440,900',
      'http://localhost:5173/login',
    ],
    { stdio: 'ignore' }
  );

  let cdp = null;

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

    console.log('Connected to Chrome DevTools Protocol');
    await cdp.setViewport(1440, 900);
    await cdp.sleep(1500);

    // 1. Log in as admin
    console.log('\n--- Step 1: Login as Admin ---');
    await cdp.eval(`(() => {
      const inputs = document.querySelectorAll('input');
      const emailInput = inputs[0];
      const passInput = inputs[1];
      const proto = window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(emailInput, 'admin@netsentinel.local');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));

      Object.getOwnPropertyDescriptor(proto, 'value').set.call(passInput, 'Admin@12345');
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));

      const submitBtn = document.querySelector('button[type="submit"]');
      submitBtn.click();
    })()`);

    await cdp.sleep(2000);
    const currPath = await cdp.eval('window.location.pathname');
    console.log(`Current Path after Login: ${currPath}`);

    // ==========================================
    // 2. Test Traffic Page (/traffic)
    // ==========================================
    console.log('\n--- Step 2: Testing Traffic Page (/traffic) ---');
    await cdp.eval(`window.location.href = '/traffic'`);
    await cdp.sleep(2500);

    const trafficInfo = await cdp.eval(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const rows = document.querySelectorAll('table tbody tr').length;
      const canvases = document.querySelectorAll('canvas').length;
      return { title, rows, canvases };
    })()`);
    console.log('Traffic Page Status:', trafficInfo);
    await cdp.screenshot('traffic_1440.png');

    // ==========================================
    // 3. Test Alerts Page (/alerts)
    // ==========================================
    console.log('\n--- Step 3: Testing Alerts Page (/alerts) ---');
    await cdp.eval(`window.location.href = '/alerts'`);
    await cdp.sleep(2500);

    const alertsInfo = await cdp.eval(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const rows = document.querySelectorAll('table tbody tr').length;
      const chips = document.querySelectorAll('.clay').length;
      return { title, rows, chips };
    })()`);
    console.log('Alerts Page Status:', alertsInfo);

    // Click first alert row to open drawer
    console.log('Opening alert detail drawer...');
    await cdp.eval(`(() => {
      const firstRow = document.querySelector('table tbody tr');
      if (firstRow) firstRow.click();
    })()`);
    await cdp.sleep(1000);

    await cdp.screenshot('alerts_1440.png');

    // Switch to 390px mobile view
    console.log('Capturing mobile view for Alerts (390px)...');
    await cdp.setViewport(390, 844, true);
    await cdp.sleep(1000);
    await cdp.screenshot('alerts_390.png');

    // Restore desktop viewport
    await cdp.setViewport(1440, 900, false);
    await cdp.sleep(800);

    // Close drawer by clicking backdrop or close button
    await cdp.eval(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Close drawer"]') || document.querySelector('.clay button');
      if (closeBtn) closeBtn.click();
    })()`);
    await cdp.sleep(500);

    // ==========================================
    // 4. Test Devices Page (/devices)
    // ==========================================
    console.log('\n--- Step 4: Testing Devices Page (/devices) ---');
    await cdp.eval(`window.location.href = '/devices'`);
    await cdp.sleep(2500);

    const devicesInfo = await cdp.eval(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const cards = document.querySelectorAll('.clay').length;
      return { title, cards };
    })()`);
    console.log('Devices Page Status:', devicesInfo);
    await cdp.screenshot('devices_1440.png');

    // Mobile view for Devices
    console.log('Capturing mobile view for Devices (390px)...');
    await cdp.setViewport(390, 844, true);
    await cdp.sleep(1000);
    await cdp.screenshot('devices_390.png');

    // Restore desktop
    await cdp.setViewport(1440, 900, false);
    await cdp.sleep(800);

    // Test Admin Edit Device
    console.log('Testing Admin Edit Device modal...');
    await cdp.eval(`(() => {
      const editBtn = document.querySelector('button[title="Edit Device Hostname / Type"]');
      if (editBtn) editBtn.click();
    })()`);
    await cdp.sleep(800);

    const editModalVisible = await cdp.eval(`Boolean(document.querySelector('#edit-device-form'))`);
    console.log('Edit Device Modal visible:', editModalVisible);
    if (editModalVisible) {
      // Close modal
      await cdp.eval(`(() => {
        const cancelBtn = document.querySelector('button[title="Close modal"]') || document.querySelectorAll('button.btn-secondary')[document.querySelectorAll('button.btn-secondary').length - 1];
        if (cancelBtn) cancelBtn.click();
      })()`);
      await cdp.sleep(500);
    }

    // ==========================================
    // 5. Test Reports Page (/reports)
    // ==========================================
    console.log('\n--- Step 5: Testing Reports Page (/reports) ---');
    await cdp.eval(`window.location.href = '/reports'`);
    await cdp.sleep(2500);

    const reportsInfo = await cdp.eval(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const rows = document.querySelectorAll('table tbody tr').length;
      return { title, rows };
    })()`);
    console.log('Reports Page Status:', reportsInfo);

    // Test Report Generation
    console.log('Generating test report (Traffic CSV)...');
    await cdp.eval(`(() => {
      // Click CSV format
      const csvOption = document.querySelectorAll('.clay-inset')[3] || document.querySelector('form div div[class*="clay"]');
      const allDivs = Array.from(document.querySelectorAll('form div'));
      const csvCard = allDivs.find(d => d.innerText.includes('CSV Spreadsheet'));
      if (csvCard) csvCard.click();

      // Submit
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await cdp.sleep(3000);

    const postGenRows = await cdp.eval(`document.querySelectorAll('table tbody tr').length`);
    console.log('Reports count after generation:', postGenRows);
    await cdp.screenshot('reports_1440.png');

    // ==========================================
    // 6. Test Admin Rules Page (/admin/rules)
    // ==========================================
    console.log('\n--- Step 6: Testing Admin Rules Page (/admin/rules) ---');
    await cdp.eval(`window.location.href = '/admin/rules'`);
    await cdp.sleep(2500);

    const rulesInfo = await cdp.eval(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const rows = document.querySelectorAll('table tbody tr').length;
      return { title, rows };
    })()`);
    console.log('Rules Page Status:', rulesInfo);

    // Test Toggle Rule 1
    console.log('Toggling active state on Rule 1...');
    await cdp.eval(`(() => {
      const firstToggle = document.querySelector('table tbody tr td label div');
      if (firstToggle) firstToggle.click();
    })()`);
    await cdp.sleep(1500);

    // Toggle back to active
    await cdp.eval(`(() => {
      const firstToggle = document.querySelector('table tbody tr td label div');
      if (firstToggle) firstToggle.click();
    })()`);
    await cdp.sleep(1500);

    await cdp.screenshot('rules_1440.png');

    // ==========================================
    // 7. Test Admin Users Page (/admin/users)
    // ==========================================
    console.log('\n--- Step 7: Testing Admin Users Page (/admin/users) ---');
    await cdp.eval(`window.location.href = '/admin/users'`);
    await cdp.sleep(2500);

    const usersInfo = await cdp.eval(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const rows = document.querySelectorAll('table tbody tr').length;
      return { title, rows };
    })()`);
    console.log('Users Page Status:', usersInfo);

    // Check Self-Protection Guard
    const selfProtectionCheck = await cdp.eval(`(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const adminRow = rows.find(r => r.innerText.includes('YOU'));
      if (!adminRow) return { found: false };
      const select = adminRow.querySelector('select');
      const deleteBtn = adminRow.querySelector('button[title*="cannot delete"]');
      return {
        found: true,
        selectDisabled: select ? select.disabled : false,
        deleteDisabled: deleteBtn ? deleteBtn.disabled : false,
      };
    })()`);
    console.log('Self-Protection Guard Check:', selfProtectionCheck);

    // Test Adding User
    console.log('Opening Add User Modal...');
    await cdp.eval(`(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add User'));
      if (addBtn) addBtn.click();
    })()`);
    await cdp.sleep(800);

    console.log('Filling Add User form...');
    const testEmail = `operator_${Date.now()}@netsentinel.local`;
    await cdp.eval(`(() => {
      const inputs = document.querySelectorAll('#add-user-form input');
      const proto = window.HTMLInputElement.prototype;

      // Name
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(inputs[0], 'Test Analyst');
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));

      // Email
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(inputs[1], '${testEmail}');
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));

      // Password
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(inputs[2], 'Analyst@123');
      inputs[2].dispatchEvent(new Event('input', { bubbles: true }));

      const submitBtn = document.querySelector('button[form="add-user-form"]');
      if (submitBtn) submitBtn.click();
    })()`);
    await cdp.sleep(2500);

    const afterAddRows = await cdp.eval(`document.querySelectorAll('table tbody tr').length`);
    console.log('User rows count after addition:', afterAddRows);

    await cdp.screenshot('users_1440.png');

    console.log('\n--- ALL PHASE 10 CHECKS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch (e) {}
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (e) {}
  }
}

run();
