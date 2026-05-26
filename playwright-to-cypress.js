// playwright-to-cypress.js — Playwright → Cypress conversion engine

const PLAYWRIGHT_EXAMPLES = {
  login: `import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('submit-button')).toBeEnabled();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.getByTestId('email-input').fill('user@example.com');
    await page.getByTestId('password-input').fill('SecurePass123');
    await page.getByTestId('submit-button').click();
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByTestId('welcome-message')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByTestId('email-input').fill('bad@example.com');
    await page.getByTestId('password-input').fill('wrongpass');
    await page.getByTestId('submit-button').click();
    await expect(page.getByTestId('error-message')).toHaveText('Invalid credentials');
  });
});`,

  dashboard: `import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/users', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
    await page.goto('/dashboard');
    await page.waitForResponse(res => res.url().includes('/api/users'));
  });

  test('should display user list', async ({ page }) => {
    await expect(page.getByTestId('user-list')).toBeVisible();
    await expect(page.getByTestId('user-item')).toHaveCount(5);
  });

  test('should create a new task', async ({ page }) => {
    await page.getByTestId('add-task-button').click();
    await page.getByTestId('task-title-input').fill('New Task');
    await page.getByTestId('task-submit-button').click();
    await expect(page.getByTestId('success-toast')).toBeVisible();
  });

  test('should logout', async ({ page }) => {
    await page.getByTestId('user-menu').click();
    await page.getByTestId('logout-button').click();
    await expect(page).toHaveURL(/.*login/);
  });
});`,

  form: `import { test, expect } from '@playwright/test';

test.describe('Registration Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should validate required fields', async ({ page }) => {
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByTestId('name-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).toBeVisible();
  });

  test('should accept valid input', async ({ page }) => {
    await page.getByTestId('name-input').fill('Jane Doe');
    await page.getByTestId('email-input').fill('jane@example.com');
    await page.getByTestId('password-input').fill('StrongPass123!');
    await page.getByTestId('agree-checkbox').check();
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page).toHaveURL(/.*success/);
  });

  test('should clear and reset a field', async ({ page }) => {
    await page.getByTestId('name-input').fill('Test Name');
    await page.getByTestId('name-input').clear();
    await expect(page.getByTestId('name-input')).toHaveValue('');
  });
});`,

  navigation: `import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-about').click();
    await expect(page).toHaveURL(/.*about/);
    await page.goBack();
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('should handle reload', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('counter')).toHaveText('0');
    await page.getByTestId('increment').click();
    await page.reload();
    await expect(page.getByTestId('counter')).toHaveText('0');
  });

  test('should support mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.getByTestId('hamburger')).toBeVisible();
    await expect(page.getByTestId('desktop-nav')).toBeHidden();
  });
});`,

  api: `import { test, expect } from '@playwright/test';

test.describe('API Requests', () => {
  test('should fetch user data', async ({ request }) => {
    const response = await request.get('/api/users');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toHaveLength(10);
  });

  test('should intercept and mock API', async ({ page }) => {
    await page.route('**/api/login', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ token: 'abc123', userId: 1 }),
      });
    });
    const loginPromise = page.waitForResponse(res => res.url().includes('/api/login'));
    await page.goto('/login');
    await page.getByTestId('email').fill('test@example.com');
    await page.getByTestId('password').fill('password');
    await page.getByTestId('submit').click();
    await loginPromise;
    await expect(page).toHaveURL(/.*dashboard/);
  });
});`
};

function convertLocatorToCy(locatorStr) {
  const testId = locatorStr.match(/getByTestId\(['"`]([^'"`]+)['"`]\)/);
  if (testId) return `cy.get('[data-cy="${testId[1]}"]')`;
  const role = locatorStr.match(/getByRole\(['"`]([^'"`]+)['"`](?:,\s*\{[^}]*name:\s*\/([^/]+)\/[^}]*\})?\)/);
  if (role) {
    if (role[2]) return `cy.get('[role="${role[1]}"]').contains(/${role[2]}/)`;
    return `cy.get('[role="${role[1]}"]')`;
  }
  const text = locatorStr.match(/getByText\(['"`]([^'"`]+)['"`]\)/);
  if (text) return `cy.contains('${text[1]}')`;
  const placeholder = locatorStr.match(/getByPlaceholder\(['"`]([^'"`]+)['"`]\)/);
  if (placeholder) return `cy.get('[placeholder="${placeholder[1]}"]')`;
  const label = locatorStr.match(/getByLabel\(['"`]([^'"`]+)['"`]\)/);
  if (label) return `cy.get('[aria-label="${label[1]}"]')`;
  const altText = locatorStr.match(/getByAltText\(['"`]([^'"`]+)['"`]\)/);
  if (altText) return `cy.get('img[alt="${altText[1]}"]')`;
  const title = locatorStr.match(/getByTitle\(['"`]([^'"`]+)['"`]\)/);
  if (title) return `cy.get('[title="${title[1]}"]')`;
  const cssLoc = locatorStr.match(/\.locator\(['"`]([^'"`]+)['"`]\)/);
  if (cssLoc) return `cy.get('${cssLoc[1]}')`;
  return null;
}

function convertPWAssertion(assertionStr) {
  const map = {
    'toBeVisible()': "should('be.visible')",
    'toBeHidden()': "should('be.hidden')",
    'toBeEnabled()': "should('be.enabled')",
    'toBeDisabled()': "should('be.disabled')",
    'toBeChecked()': "should('be.checked')",
    'not.toBeChecked()': "should('not.be.checked')",
    'toBeAttached()': "should('exist')",
    'not.toBeAttached()': "should('not.exist')",
    'toBeEmpty()': "should('be.empty')",
    'toBeFocused()': "should('be.focused')",
  };
  if (map[assertionStr]) return map[assertionStr];

  const textM = assertionStr.match(/toHaveText\(['"`]([^'"`]*)['"`]\)/);
  if (textM) return `should('have.text', '${textM[1]}')`;
  const valueM = assertionStr.match(/toHaveValue\(['"`]([^'"`]*)['"`]\)/);
  if (valueM) return `should('have.value', '${valueM[1]}')`;
  const containsM = assertionStr.match(/toContainText\(['"`]([^'"`]*)['"`]\)/);
  if (containsM) return `should('contain', '${containsM[1]}')`;
  const countM = assertionStr.match(/toHaveCount\((\d+)\)/);
  if (countM) return `should('have.length', ${countM[1]})`;
  const classM = assertionStr.match(/toHaveClass\(['"`]([^'"`]*)['"`]\)/);
  if (classM) return `should('have.class', '${classM[1]}')`;
  const attrM = assertionStr.match(/toHaveAttribute\(['"`]([^'"`]*)['"`](?:,\s*['"`]([^'"`]*)['"`])?\)/);
  if (attrM) return attrM[2] ? `should('have.attr', '${attrM[1]}', '${attrM[2]}')` : `should('have.attr', '${attrM[1]}')`;

  return null;
}

function convertPlaywrightLine(line, warns) {
  const t = line.trim();
  if (!t || t.startsWith('//') || t.startsWith('import ') || t.startsWith('*')) return '  ' + t;

  // page.goto
  const gotoM = t.match(/await page\.goto\(['"`]([^'"`]+)['"`]\)/);
  if (gotoM) return `    cy.visit('${gotoM[1]}')`;

  // page.reload
  if (/await page\.reload\(\)/.test(t)) return `    cy.reload()`;

  // page.goBack
  if (/await page\.goBack\(\)/.test(t)) return `    cy.go('back')`;

  // page.goForward
  if (/await page\.goForward\(\)/.test(t)) return `    cy.go('forward')`;

  // page.context().clearCookies
  if (/clearCookies/.test(t)) return `    cy.clearCookies()`;

  // localStorage.clear
  if (/localStorage\.clear/.test(t)) return `    cy.clearLocalStorage()`;

  // page.screenshot
  if (/page\.screenshot/.test(t)) return `    cy.screenshot()`;

  // console.log
  const logM = t.match(/console\.log\(['"`]([^'"`]*)['"`]\)/);
  if (logM) return `    cy.log('${logM[1]}')`;

  // page.setViewportSize
  const vpM = t.match(/page\.setViewportSize\(\{\s*width:\s*(\d+),\s*height:\s*(\d+)/);
  if (vpM) return `    cy.viewport(${vpM[1]}, ${vpM[2]})`;

  // page.waitForTimeout
  const timeoutM = t.match(/page\.waitForTimeout\((\d+)\)/);
  if (timeoutM) return `    cy.wait(${timeoutM[1]})`;

  // page.route
  if (/page\.route\(/.test(t)) {
    const routeM = t.match(/page\.route\(['"`]\*\*([^'"`]+)['"`]/);
    const url = routeM ? routeM[1] : '/api/route';
    warns.push(`page.route() → cy.intercept() — verify the mock body`);
    return `    cy.intercept('*', '${url}', {}).as('routeAlias')`;
  }

  // page.waitForResponse
  const wfrM = t.match(/waitForResponse\(.*?includes\(['"`]([^'"`]+)['"`]\)/);
  if (wfrM) return `    cy.wait('@routeAlias')`;

  // page.waitForURL
  const wfuM = t.match(/page\.waitForURL\(['"`]([^'"`]+)['"`]\)/);
  if (wfuM) return `    cy.url().should('include', '${wfuM[1]}')`;

  // expect(page).toHaveURL
  const urlM = t.match(/expect\(page\)\.toHaveURL\(/);
  if (urlM) {
    const regexM = t.match(/toHaveURL\(new RegExp\(['"`]([^'"`]+)['"`]\)\)/);
    const strM = t.match(/toHaveURL\(['"`]([^'"`]+)['"`]\)/);
    if (regexM) return `    cy.url().should('include', '${regexM[1]}')`;
    if (strM) return `    cy.url().should('eq', '${strM[1]}')`;
    return `    cy.url().should('include', /* expected */)`;
  }

  // expect(page).toHaveTitle
  const titleM = t.match(/expect\(page\)\.toHaveTitle\(['"`]([^'"`]*)['"`]\)/);
  if (titleM) return `    cy.title().should('eq', '${titleM[1]}')`;

  // expect(locator).assertion
  const expectM = t.match(/await expect\(page\.(.+?)\)\.(.+?);/);
  if (expectM) {
    const locatorStr = expectM[1];
    const assertionStr = expectM[2];
    const cyLocator = convertLocatorToCy(locatorStr);
    const cyAssertion = convertPWAssertion(assertionStr);
    if (cyLocator && cyAssertion) return `    ${cyLocator}.${cyAssertion}`;
    if (cyLocator) {
      warns.push(`Assertion '${assertionStr}' — convert manually`);
      return `    ${cyLocator} // TODO: .${assertionStr}`;
    }
  }

  // await page.locator.action()
  const actionM = t.match(/await page\.(.+?)\.(fill|click|check|uncheck|clear|focus|blur|selectOption|dblclick|scrollIntoViewIfNeeded|press|dispatchEvent)\(([^)]*)\)/);
  if (actionM) {
    const locatorStr = actionM[1];
    const action = actionM[2];
    const arg = actionM[3];
    const cyLocator = convertLocatorToCy(locatorStr);
    if (cyLocator) {
      const actionMap = {
        fill: `type(${arg})`,
        click: 'click()',
        check: 'check()',
        uncheck: 'uncheck()',
        clear: 'clear()',
        focus: 'focus()',
        blur: 'blur()',
        selectOption: `select(${arg})`,
        dblclick: 'dblclick()',
        scrollIntoViewIfNeeded: 'scrollIntoView()',
        press: `type('{enter}')`,
        dispatchEvent: `trigger(${arg})`,
      };
      return `    ${cyLocator}.${actionMap[action] || action + '()'}`;
    }
  }

  // const x = page.locator (variable declaration)
  const varM = t.match(/const\s+(\w+)\s*=\s*page\.(.+?);?$/);
  if (varM) {
    const cyLocator = convertLocatorToCy(varM[2]);
    if (cyLocator) return `    ${cyLocator}.as('${varM[1]}')`;
  }

  // skip structural tokens
  if (/^[{}();,]$/.test(t) || t === 'async ({ page }) => {' || t === '});') return null;
  if (/^test\.|^import /.test(t)) return null;

  if (/await /.test(t)) {
    warns.push(`Unhandled: ${t.slice(0, 60)}`);
    return `    // TODO: ${t}`;
  }

  return '  ' + t;
}

function convertPlaywrightToCypress(source) {
  const warns = [];
  const lines = source.split('\n');
  const out = [];
  let depth = 0;

  const ind = (d) => '  '.repeat(Math.max(0, d));
  const HOOKS = {
    'test.beforeEach': 'beforeEach',
    'test.beforeAll': 'before',
    'test.afterEach': 'afterEach',
    'test.afterAll': 'after',
  };

  out.push('// Converted from Playwright to Cypress');
  out.push('// @ts-check\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();

    if (!t) { out.push(''); continue; }
    if (t.startsWith('import ')) continue;

    const descM = t.match(/^test\.describe\s*\(\s*['"`](.+?)['"`]/);
    const testM = t.match(/^test\s*\(\s*['"`](.+?)['"`]/);
    const hookM = Object.keys(HOOKS).find(h => t.startsWith(h + '('));

    if (descM) {
      out.push(`${ind(depth)}describe('${descM[1]}', () => {`);
      depth++;
    } else if (testM) {
      out.push(`\n${ind(depth)}it('${testM[1]}', () => {`);
      depth++;
    } else if (hookM) {
      out.push(`\n${ind(depth)}${HOOKS[hookM]}(() => {`);
      depth++;
    } else if (t === '});' || t === '})') {
      depth = Math.max(0, depth - 1);
      out.push(`${ind(depth)}});`);
    } else if (t === '{' || t === '}' || t === '' || /^async \(\{/.test(t)) {
      // skip
    } else {
      const converted = convertPlaywrightLine(raw, warns);
      if (converted !== null) out.push(converted);
    }
  }

  const code = out.join('\n');
  const cmdCount = (source.match(/await page\./g) || []).length + (source.match(/await expect\(/g) || []).length;
  const todoCount = (code.match(/\/\/ TODO/g) || []).length;

  return { testCode: code, pomCode: '', warns, cmdCount, todoCount };
}
