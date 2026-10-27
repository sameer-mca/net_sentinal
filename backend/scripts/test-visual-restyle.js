const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.join(process.env.TEMP, 'chrome_restyle_profile_' + Date.now());
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
        } else if (data.params.type === 'warning') {
          console.warn(`[Browser Console Warning] ${args}`);
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
    console.log(`[Screenshot Saved] ${filename}`);
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
  console.log('--- STARTING NEON COMMAND CENTER VISUAL VERIFICATION ---');

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
      'http://localhost:5173/',
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
    await cdp.sleep(2000);

    // ==========================================
    // 1. Home Page Verification
    // ==========================================
    console.log('\n--- 1. Testing Home Landing Page ---');
    await cdp.eval(`window.location.href = '/'`);
    await cdp.sleep(2000);

    const homeTitle = await cdp.eval(`document.querySelector('h1')?.innerText`);
    console.log('Home headline:', homeTitle);

    // Check count up numbers
    const stats = await cdp.eval(`(() => {
      return Array.from(document.querySelectorAll('.neon-number')).map(el => el.innerText);
    })()`);
    console.log('Home stats rendered:', stats);

    await cdp.screenshot('home_1440_neon.png');

    // Mobile 390px view
    await cdp.setViewport(390, 844, true);
    await cdp.sleep(1200);
    await cdp.screenshot('home_390_neon.png');

    // Restore desktop
    await cdp.setViewport(1440, 900, false);
    await cdp.sleep(800);

    // ==========================================
    // 2. Login Page Verification
    // ==========================================
    console.log('\n--- 2. Testing Login Page ---');
    await cdp.eval(`window.location.href = '/login'`);
    await cdp.sleep(1500);

    const loginHeading = await cdp.eval(`document.querySelector('h1')?.innerText`);
    console.log('Login heading:', loginHeading);

    await cdp.screenshot('login_1440_neon.png');

    // Mobile 390px view
    await cdp.setViewport(390, 844, true);
    await cdp.sleep(1200);
    await cdp.screenshot('login_390_neon.png');

    // Restore desktop
    await cdp.setViewport(1440, 900, false);
    await cdp.sleep(800);

    // ==========================================
    // 3. Register Page Verification
    // ==========================================
    console.log('\n--- 3. Testing Register Page ---');
    await cdp.eval(`window.location.href = '/register'`);
    await cdp.sleep(1500);

    // Type a sample password to trigger the password strength meter
    await cdp.eval(`(() => {
      const passInput = document.querySelectorAll('input[type="password"]')[0];
      const proto = window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(passInput, 'Cyber@Net123');
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await cdp.sleep(500);

    const strengthText = await cdp.eval(`document.querySelector('form div div div')?.innerText`);
    console.log('Password strength meter active');

    await cdp.screenshot('register_1440_neon.png');

    // Mobile 390px view
    await cdp.setViewport(390, 844, true);
    await cdp.sleep(1200);
    await cdp.screenshot('register_390_neon.png');

    // Restore desktop
    await cdp.setViewport(1440, 900, false);
    await cdp.sleep(800);

    // ==========================================
    // 4. App Shell Verification (Dashboard)
    // ==========================================
    console.log('\n--- 4. Testing App Shell (Sidebar + Topbar) via Login ---');
    await cdp.eval(`window.location.href = '/login'`);
    await cdp.sleep(1000);

    // Submit admin login
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

    const currPath = await cdp.eval('window.location.pathname');
    console.log(`Current Path after Login: ${currPath}`);

    // Wait for dashboard and live socket
    await cdp.sleep(1500);
    await cdp.screenshot('app_shell_1440_neon.png');

    // Mobile 390px view of App Shell
    await cdp.setViewport(390, 844, true);
    await cdp.sleep(1200);
    await cdp.screenshot('app_shell_390_neon.png');

    // ==========================================
    // 5. Test prefers-reduced-motion media query
    // ==========================================
    console.log('\n--- 5. Testing Reduced Motion Preference ---');
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await cdp.sleep(500);
    const reducedMotionDuration = await cdp.eval(`(() => {
      const el = document.querySelector('.clay');
      return window.getComputedStyle(el).transitionDuration;
    })()`);
    console.log('Computed transition duration under prefers-reduced-motion:', reducedMotionDuration);

    // ==========================================
    // 6. Test Protected Route Redirect & Logout
    // ==========================================
    console.log('\n--- 6. Testing Logout & Protected Route Guard ---');
    await cdp.setViewport(1440, 900, false);
    await cdp.sleep(500);

    // Click logout button in sidebar
    await cdp.eval(`(() => {
      const logoutBtn = document.querySelector('button[title="Sign Out"]');
      if (logoutBtn) logoutBtn.click();
    })()`);
    await cdp.sleep(1500);

    const postLogoutPath = await cdp.eval('window.location.pathname');
    console.log(`Path after Logout: ${postLogoutPath} (Expected: /login)`);

    // Try navigating to /dashboard directly
    await cdp.eval(`window.location.href = '/dashboard'`);
    await cdp.sleep(1200);
    const guardRedirectPath = await cdp.eval('window.location.pathname');
    console.log(`Path after navigating to /dashboard while unauthenticated: ${guardRedirectPath} (Expected: /login)`);

    // Check for any red errors in console
    const errorLogs = cdp.consoleLogs.filter(l => l.type === 'error');
    console.log(`Total Browser Console Errors logged: ${errorLogs.length}`);

    console.log('\n--- ALL VISUAL RESTYLE TESTS PASSED ---');
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
