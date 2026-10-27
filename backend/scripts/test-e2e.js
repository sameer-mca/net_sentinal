const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(process.env.TEMP, 'chrome_cdp_profile_' + Date.now());
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
        console.log(`[Browser Console] ${data.params.type}: ${args}`);
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
    await new Promise((r) => setTimeout(r, 800));
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function run() {
  console.log('Starting headless Chrome with remote debugging on port 9222...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    `--user-data-dir=${USER_DATA_DIR}`,
    'http://localhost:5173/',
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

    console.log('\n=== TASK 1: CAPTURING RESPONSIVE SCREENSHOTS ===');
    const pages = [
      { name: 'home', url: 'http://localhost:5173/' },
      { name: 'login', url: 'http://localhost:5173/login' },
      { name: 'register', url: 'http://localhost:5173/register' },
    ];

    const viewports = [
      { width: 360, height: 780, suffix: '360', mobile: true },
      { width: 768, height: 1024, suffix: '768', mobile: false },
      { width: 1440, height: 900, suffix: '1440', mobile: false },
    ];

    for (const p of pages) {
      await cdp.navigate(p.url);
      for (const v of viewports) {
        await cdp.screenshot(`${p.name}_${v.suffix}.png`, v.width, v.height, v.mobile);
      }
    }

    // Reset to desktop viewport for testing
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('\n=== TASK 2: ACCEPTANCE CHECK: ROUTING & AUTH FLOWS ===');

    // 1. Visit /dashboard when logged out -> should redirect to /login
    await cdp.eval('localStorage.clear();');
    await cdp.navigate('http://localhost:5173/dashboard');
    await new Promise((r) => setTimeout(r, 1000));
    const urlAfterLoggedOutVisit = await cdp.eval('window.location.pathname');
    console.log(`[Check 1] Visiting /dashboard logged out: pathname = "${urlAfterLoggedOutVisit}" (Expected: "/login")`);
    if (urlAfterLoggedOutVisit !== '/login') {
      throw new Error(`Failed check 1: expected /login, got ${urlAfterLoggedOutVisit}`);
    }

    // Helper to set React input values
    const setInputValueSnippet = `
      function setReactVal(el, val) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `;

    // 2. Register a new user
    const testEmail = `operator_${Date.now()}@netsentinel.local`;
    await cdp.navigate('http://localhost:5173/register');
    await cdp.eval(`
      ${setInputValueSnippet}
      const inputs = document.querySelectorAll('input');
      setReactVal(inputs[0], 'Operator Tester');
      setReactVal(inputs[1], '${testEmail}');
      setReactVal(inputs[2], 'Password123');
      setReactVal(inputs[3], 'Password123');
      document.querySelector('button[type="submit"]').click();
    `);
    await new Promise((r) => setTimeout(r, 1500));
    const urlAfterRegister = await cdp.eval('window.location.pathname');
    console.log(`[Check 2] Registered new user ${testEmail}: pathname = "${urlAfterRegister}" (Expected: "/login")`);
    if (urlAfterRegister !== '/login') {
      throw new Error(`Failed check 2: expected /login after register, got ${urlAfterRegister}`);
    }

    // 3. Log in with registered user
    await cdp.eval(`(() => {
      ${setInputValueSnippet}
      const inputs = document.querySelectorAll('input');
      setReactVal(inputs[0], '${testEmail}');
      setReactVal(inputs[1], 'Password123');
      document.querySelector('button[type="submit"]').click();
    })()`);
    await new Promise((r) => setTimeout(r, 1800));
    const urlAfterLogin = await cdp.eval('window.location.pathname');
    const userRole = await cdp.eval('JSON.parse(localStorage.getItem("ns_user") || "{}").role');
    console.log(`[Check 3] Logged in as normal user: pathname = "${urlAfterLogin}" (Expected: "/dashboard"), role = "${userRole}"`);
    if (urlAfterLogin !== '/dashboard') {
      throw new Error(`Failed check 3: expected /dashboard after login, got ${urlAfterLogin}`);
    }

    // 4. Try to access /admin/users as normal user -> should be redirected to /dashboard
    await cdp.navigate('http://localhost:5173/admin/users');
    await new Promise((r) => setTimeout(r, 1200));
    const urlAfterNormalAdminVisit = await cdp.eval('window.location.pathname');
    console.log(`[Check 4] Normal user visiting /admin/users: pathname = "${urlAfterNormalAdminVisit}" (Expected: "/dashboard")`);
    if (urlAfterNormalAdminVisit !== '/dashboard') {
      throw new Error(`Failed check 4: normal user was not redirected away from /admin/users, got ${urlAfterNormalAdminVisit}`);
    }

    // 5. Log out works
    await cdp.eval(`(() => {
      const logoutBtn = document.querySelector('button[title="Logout"]');
      if (logoutBtn) logoutBtn.click();
    })()`);
    await new Promise((r) => setTimeout(r, 1200));
    const urlAfterLogout = await cdp.eval('window.location.pathname');
    const tokenAfterLogout = await cdp.eval('localStorage.getItem("ns_token")');
    console.log(`[Check 5] Logout: pathname = "${urlAfterLogout}" (Expected: "/login"), token = ${tokenAfterLogout}`);
    if (urlAfterLogout !== '/login' || tokenAfterLogout !== null) {
      throw new Error(`Failed check 5: logout failed, pathname=${urlAfterLogout}, token=${tokenAfterLogout}`);
    }

    // 6. Log in as seeded admin and visit /admin/users
    await cdp.eval(`(() => {
      ${setInputValueSnippet}
      const inputs = document.querySelectorAll('input');
      setReactVal(inputs[0], 'admin@netsentinel.local');
      setReactVal(inputs[1], 'Admin@12345');
      document.querySelector('button[type="submit"]').click();
    })()`);
    await new Promise((r) => setTimeout(r, 1800));
    const adminUrlAfterLogin = await cdp.eval('window.location.pathname');
    console.log(`[Check 6a] Logged in as admin: pathname = "${adminUrlAfterLogin}"`);

    await cdp.navigate('http://localhost:5173/admin/users');
    await new Promise((r) => setTimeout(r, 1200));
    const adminUsersPath = await cdp.eval('window.location.pathname');
    const adminUsersTitle = await cdp.eval('document.querySelector("h3")?.innerText');
    console.log(`[Check 6b] Admin visiting /admin/users: pathname = "${adminUsersPath}", card title = "${adminUsersTitle}"`);
    if (adminUsersPath !== '/admin/users') {
      throw new Error(`Failed check 6: admin was not allowed to open /admin/users, got ${adminUsersPath}`);
    }

    // Capture screenshots of Dashboard and Admin Users
    await cdp.navigate('http://localhost:5173/dashboard');
    await cdp.screenshot('dashboard_preview_1440.png', 1440, 900, false);
    await cdp.navigate('http://localhost:5173/admin/users');
    await cdp.screenshot('admin_users_preview_1440.png', 1440, 900, false);

    console.log('\nALL ACCEPTANCE CHECKS PASSED SUCCESSFULLY!');
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill('SIGKILL');
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
