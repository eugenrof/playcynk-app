// converter.js — Cypress → Playwright conversion engine

const CYPRESS_EXAMPLES = {
  login: `describe('Login Page', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit('/login')
  })

  it('should display login form', () => {
    cy.get('[data-cy="login-form"]').should('be.visible')
    cy.get('[data-cy="email-input"]').should('be.visible')
    cy.get('[data-cy="password-input"]').should('be.visible')
    cy.get('[data-cy="submit-button"]').should('be.enabled')
  })

  it('should login with valid credentials', () => {
    cy.get('[data-cy="email-input"]').type('user@example.com')
    cy.get('[data-cy="password-input"]').type('SecurePass123')
    cy.get('[data-cy="submit-button"]').click()
    cy.url().should('include', '/dashboard')
    cy.get('[data-cy="welcome-message"]').should('be.visible')
  })

  it('should show error for invalid credentials', () => {
    cy.get('[data-cy="email-input"]').type('bad@example.com')
    cy.get('[data-cy="password-input"]').type('wrongpass')
    cy.get('[data-cy="submit-button"]').click()
    cy.get('[data-cy="error-message"]').should('have.text', 'Invalid credentials')
  })

  it('should navigate to forgot password', () => {
    cy.get('[data-cy="forgot-password-link"]').click()
    cy.url().should('include', '/forgot-password')
  })
})`,

  dashboard: `describe('Dashboard', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('getUsers')
    cy.intercept('POST', '/api/tasks', {}).as('createTask')
    cy.visit('/dashboard')
    cy.wait('@getUsers')
  })

  it('should display user list', () => {
    cy.get('[data-testid="user-list"]').should('be.visible')
    cy.get('[data-testid="user-item"]').should('have.length', 5)
  })

  it('should filter by search', () => {
    cy.get('[data-testid="search-input"]').type('John')
    cy.get('[data-testid="user-item"]').should('have.length', 1)
    cy.contains('John Doe')
  })

  it('should create a new task', () => {
    cy.get('[data-testid="add-task-button"]').click()
    cy.get('[data-testid="task-title-input"]').type('New Task')
    cy.get('[data-testid="task-submit-button"]').click()
    cy.wait('@createTask')
    cy.get('[data-testid="success-toast"]').should('be.visible')
  })

  it('should logout', () => {
    cy.get('[data-testid="user-menu"]').click()
    cy.get('[data-testid="logout-button"]').click()
    cy.url().should('include', '/login')
  })
})`,

  form: `describe('Registration Form', () => {
  beforeEach(() => {
    cy.visit('/register')
  })

  it('should validate required fields', () => {
    cy.get('button[type="submit"]').click()
    cy.get('[data-cy="name-error"]').should('be.visible')
    cy.get('[data-cy="email-error"]').should('be.visible')
  })

  it('should accept valid input', () => {
    cy.get('[data-cy="name-input"]').type('Jane Doe')
    cy.get('[data-cy="email-input"]').type('jane@example.com')
    cy.get('[data-cy="password-input"]').type('StrongPass123!')
    cy.get('[data-cy="agree-checkbox"]').check()
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/success')
  })

  it('should clear and reset a field', () => {
    cy.get('[data-cy="name-input"]').type('Test Name')
    cy.get('[data-cy="name-input"]').clear()
    cy.get('[data-cy="name-input"]').should('have.value', '')
  })

  it('should select country from dropdown', () => {
    cy.get('[data-cy="country-select"]').select('Romania')
    cy.get('[data-cy="country-select"]').should('have.value', 'RO')
  })
})`,

  navigation: `describe('Navigation', () => {
  it('should navigate between pages', () => {
    cy.visit('/')
    cy.get('[data-cy="nav-about"]').click()
    cy.url().should('include', '/about')
    cy.go('back')
    cy.url().should('eq', 'http://localhost:3000/')
  })

  it('should handle reload', () => {
    cy.visit('/dashboard')
    cy.get('[data-cy="counter"]').should('have.text', '0')
    cy.get('[data-cy="increment"]').click()
    cy.reload()
    cy.get('[data-cy="counter"]').should('have.text', '0')
  })

  it('should support mobile viewport', () => {
    cy.viewport(375, 812)
    cy.visit('/')
    cy.get('[data-cy="hamburger"]').should('be.visible')
    cy.get('[data-cy="desktop-nav"]').should('not.be.visible')
  })
})`,

  api: `describe('API Requests', () => {
  it('should fetch user data', () => {
    cy.request('GET', '/api/users').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.length(10)
    })
  })

  it('should intercept and mock API', () => {
    cy.intercept('POST', '/api/login', {
      statusCode: 200,
      body: { token: 'abc123', userId: 1 }
    }).as('loginRequest')

    cy.visit('/login')
    cy.get('[data-cy="email"]').type('test@example.com')
    cy.get('[data-cy="password"]').type('password')
    cy.get('[data-cy="submit"]').click()
    cy.wait('@loginRequest')
    cy.url().should('include', '/dashboard')
  })

  it('should handle network errors', () => {
    cy.intercept('GET', '/api/data', { forceNetworkError: true }).as('failedRequest')
    cy.visit('/data-page')
    cy.wait('@failedRequest')
    cy.get('[data-cy="error-state"]').should('be.visible')
  })
})`
};

function convertSelector(sel) {
  const dataCy = sel.match(/\[data-cy=["']?([^"'\]]+)["']?\]/);
  if (dataCy) return { call: `page.getByTestId('${dataCy[1]}')`, name: toCamel(dataCy[1]) };
  const dataTest = sel.match(/\[data-testid=["']?([^"'\]]+)["']?\]/);
  if (dataTest) return { call: `page.getByTestId('${dataTest[1]}')`, name: toCamel(dataTest[1]) };
  const dataTestShort = sel.match(/\[data-test=["']?([^"'\]]+)["']?\]/);
  if (dataTestShort) return { call: `page.getByTestId('${dataTestShort[1]}')`, name: toCamel(dataTestShort[1]) };
  const id = sel.match(/^#([\w-]+)$/);
  if (id) return { call: `page.locator('#${id[1]}')`, name: toCamel(id[1]) };
  const cls = sel.match(/^\.([\w-]+)$/);
  if (cls) return { call: `page.locator('.${cls[1]}')`, name: toCamel(cls[1]) };
  const placeholder = sel.match(/\[placeholder=["']([^"']+)["']\]/);
  if (placeholder) return { call: `page.getByPlaceholder('${placeholder[1]}')`, name: toCamel(placeholder[1]) };
  const alt = sel.match(/img\[alt=["']([^"']+)["']\]/);
  if (alt) return { call: `page.getByAltText('${alt[1]}')`, name: toCamel(alt[1]) };
  const title = sel.match(/\[title=["']([^"']+)["']\]/);
  if (title) return { call: `page.getByTitle('${title[1]}')`, name: toCamel(title[1]) };
  const roleMap = { button: 'button', a: 'link', select: 'combobox', textarea: 'textbox', nav: 'navigation', h1:'heading', h2:'heading', h3:'heading' };
  const bare = sel.match(/^(button|a|select|textarea|nav|h[1-6])$/);
  if (bare && roleMap[bare[1]]) return { call: `page.getByRole('${roleMap[bare[1]]}')`, name: bare[1] };
  const btnSubmit = sel.match(/button\[type=["']?submit["']?\]|input\[type=["']?submit["']?\]/);
  if (btnSubmit) return { call: `page.getByRole('button', { name: /submit/i })`, name: 'submitButton' };
  const inputType = sel.match(/input\[type=["']?(\w+)["']?\]/);
  if (inputType) {
    const typeRoles = { checkbox: 'checkbox', radio: 'radio', text: 'textbox', email: 'textbox', password: 'textbox' };
    if (typeRoles[inputType[1]]) return { call: `page.getByRole('${typeRoles[inputType[1]]}')`, name: `${inputType[1]}Input` };
  }
  const forAttr = sel.match(/\[for=["']([^"']+)["']\]/);
  if (forAttr) return { call: `page.getByLabel('${forAttr[1]}')`, name: toCamel(forAttr[1]) };
  const role = sel.match(/\[role=["']([^"']+)["']\]/);
  if (role) return { call: `page.getByRole('${role[1]}')`, name: toCamel(role[1]) };
  return { call: `page.locator('${sel}')`, name: toCamel(sel.replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g,'_')) };
}

function convertAssertion(locator, assertion, value, extra) {
  const noValMap = {
    'be.visible': 'toBeVisible()',
    'not.be.visible': 'toBeHidden()',
    'be.hidden': 'toBeHidden()',
    'not.be.hidden': 'toBeVisible()',
    'be.enabled': 'toBeEnabled()',
    'be.disabled': 'toBeDisabled()',
    'not.be.enabled': 'toBeDisabled()',
    'not.be.disabled': 'toBeEnabled()',
    'be.checked': 'toBeChecked()',
    'not.be.checked': 'not.toBeChecked()',
    'be.empty': 'toBeEmpty()',
    'not.be.empty': 'not.toBeEmpty()',
    'exist': 'toBeAttached()',
    'not.exist': 'not.toBeAttached()',
    'be.focused': 'toBeFocused()',
    'not.be.focused': 'not.toBeFocused()',
  };
  if (noValMap[assertion]) return `    await expect(${locator}).${noValMap[assertion]};`;
  if (assertion === 'have.text' || assertion === 'have.value') {
    const method = assertion === 'have.text' ? 'toHaveText' : 'toHaveValue';
    return `    await expect(${locator}).${method}('${value || ''}');`;
  }
  if (assertion === 'contain' || assertion === 'include') return `    await expect(${locator}).toContainText('${value || ''}');`;
  if (assertion === 'have.class') return `    await expect(${locator}).toHaveClass('${value || ''}');`;
  if (assertion === 'have.id') return `    await expect(${locator}).toHaveId('${value || ''}');`;
  if (assertion === 'have.length') return `    await expect(${locator}).toHaveCount(${value || 0});`;
  if (assertion === 'have.attr') return extra
    ? `    await expect(${locator}).toHaveAttribute('${value}', '${extra}');`
    : `    await expect(${locator}).toHaveAttribute('${value}');`;
  if (assertion === 'have.css') return `    await expect(${locator}).toHaveCSS('${value}', '${extra || ''}');`;
  if (assertion === 'eq' || assertion === 'equal') return `    await expect(${locator}).toBe('${value || ''}');`;
  if (assertion === 'deep.equal') return `    await expect(${locator}).toEqual(${value});`;
  if (assertion === 'match') return `    await expect(${locator}).toMatch(${value});`;
  if (assertion === 'be.gt') return `    await expect(${locator}).toBeGreaterThan(${value});`;
  if (assertion === 'be.lt') return `    await expect(${locator}).toBeLessThan(${value});`;
  return `    // TODO: await expect(${locator}).${assertion}${value ? `('${value}')` : ''}; — convert manually`;
}

function convertCypressLine(line, warns, selectors, aliasMap) {
  const t = line.trim();
  if (!t || t.startsWith('//')) return '  ' + t;

  // cy.visit
  if (/cy\.visit\(/.test(t)) {
    const m = t.match(/cy\.visit\(['"`]([^'"`]+)['"`]/);
    return m ? `    await page.goto('${m[1]}');` : `    await page.goto('/');`;
  }

  // cy.reload
  if (/cy\.reload\(\)/.test(t)) return `    await page.reload();`;

  // cy.go
  if (/cy\.go\(['"`]back/.test(t)) return `    await page.goBack();`;
  if (/cy\.go\(['"`]forward/.test(t)) return `    await page.goForward();`;

  // cy.clearCookies
  if (/cy\.clearCookies\(\)/.test(t)) return `    await page.context().clearCookies();`;

  // cy.clearLocalStorage
  if (/cy\.clearLocalStorage\(\)/.test(t)) return `    await page.evaluate(() => localStorage.clear());`;

  // cy.screenshot
  if (/cy\.screenshot\(/.test(t)) return `    await page.screenshot({ path: 'screenshots/screenshot.png' });`;

  // cy.log
  if (/cy\.log\(/.test(t)) {
    const m = t.match(/cy\.log\(['"`]([^'"`]+)['"`]/);
    return m ? `    console.log('${m[1]}');` : `    console.log('log');`;
  }

  // cy.viewport
  if (/cy\.viewport\(/.test(t)) {
    const m = t.match(/cy\.viewport\((\d+),\s*(\d+)\)/);
    return m ? `    await page.setViewportSize({ width: ${m[1]}, height: ${m[2]} });` : `    // TODO: cy.viewport()`;
  }

  // cy.url
  if (/cy\.url\(\)/.test(t)) {
    const shouldM = t.match(/\.should\(['"`]([^'"`]+)['"`](?:,\s*['"`]([^'"`]*)['"`])?\)/);
    if (shouldM) {
      const [, ass, val] = shouldM;
      if (ass === 'include' || ass === 'contain') return `    await expect(page).toHaveURL(new RegExp('${val}'));`;
      if (ass === 'eq' || ass === 'equal') return `    await expect(page).toHaveURL('${val}');`;
    }
    return `    await expect(page).toHaveURL(/* expected URL */);`;
  }

  // cy.title
  if (/cy\.title\(\)/.test(t)) return `    await expect(page).toHaveTitle(/* expected title */);`;

  // cy.contains
  if (/cy\.contains\(/.test(t) && !/cy\.get/.test(t)) {
    const m = t.match(/cy\.contains\(['"`]([^'"`]+)['"`]/);
    return m ? `    await expect(page.getByText('${m[1]}')).toBeVisible();` : `    // cy.contains() — convert manually`;
  }

  // cy.wait
  if (/cy\.wait\(/.test(t)) {
    const aliasM = t.match(/cy\.wait\(['"`]?@(\w+)['"`]?\)/);
    if (aliasM) return `    await ${aliasM[1]}Promise;`;
    const numM = t.match(/cy\.wait\((\d+)\)/);
    if (numM) {
      const ms = parseInt(numM[1]);
      if (ms > 2000) warns.push(`cy.wait(${ms}) — large timeout, prefer await expect(...).toBeVisible()`);
      return `    await page.waitForTimeout(${ms});`;
    }
    return `    // TODO: cy.wait() — convert manually`;
  }

  // cy.intercept
  if (/cy\.intercept\(/.test(t)) {
    const m = t.match(/cy\.intercept\(['"`](GET|POST|PUT|DELETE|PATCH)['"`],\s*['"`]([^'"`]+)['"`]/i);
    const aliasM = t.match(/\.as\(['"`](\w+)['"`]\)/);
    const alias = aliasM ? aliasM[1] : 'route';
    if (m) {
      const [, method, url] = m;
      aliasMap.set(alias, url);
      return [
        `    let ${alias}Promise;`,
        `    await page.route('**${url}', async route => {`,
        `      await route.fulfill({ status: 200, body: JSON.stringify({}) });`,
        `    });`,
        `    ${alias}Promise = page.waitForResponse(res =>`,
        `      res.url().includes('${url}') && res.request().method() === '${method.toUpperCase()}');`,
      ].join('\n');
    }
    warns.push(`cy.intercept() — partial conversion, review route mock`);
    return `    // TODO: cy.intercept() — convert manually\n    // ${t}`;
  }

  // cy.request
  if (/cy\.request\(/.test(t)) {
    warns.push(`cy.request() — use Playwright's apiRequest context`);
    return [
      `    // cy.request() → Playwright apiRequest`,
      `    // const response = await request.get('/api/endpoint');`,
      `    // expect(response.ok()).toBeTruthy();`,
    ].join('\n');
  }

  // cy.fixture
  if (/cy\.fixture\(/.test(t)) {
    const m = t.match(/cy\.fixture\(['"`]([^'"`]+)['"`]/);
    warns.push(`cy.fixture('${m ? m[1] : '...'}') — load as a JSON import instead`);
    return `    // const ${m ? toCamel(m[1]) : 'data'} = require('./fixtures/${m ? m[1] : 'data'}.json');`;
  }

  // cy.get
  const getM = t.match(/cy\.get\(['"`]([^'"`]+)['"`]\)/);
  if (getM) {
    const sel = getM[1];
    const conv = convertSelector(sel);
    const locator = conv.call;
    selectors.set(sel, conv);
    const lines = [];

    // alias
    const asM = t.match(/\.as\(['"`](\w+)['"`]\)/);
    if (asM) {
      aliasMap.set(asM[1], locator);
      lines.push(`    const ${asM[1]}Locator = ${locator};`);
    }

    // chained actions
    if (/\.type\(/.test(t)) {
      const vm = t.match(/\.type\(['"`]([^'"`]*)['"`]\)/);
      lines.push(`    await ${locator}.fill('${vm ? vm[1] : ''}');`);
    }
    if (/\.clear\(\)/.test(t)) lines.push(`    await ${locator}.clear();`);
    if (/\.click\(\)/.test(t)) lines.push(`    await ${locator}.click();`);
    if (/\.dblclick\(\)/.test(t)) lines.push(`    await ${locator}.dblclick();`);
    if (/\.check\(\)/.test(t) && !/\.uncheck/.test(t)) lines.push(`    await ${locator}.check();`);
    if (/\.uncheck\(\)/.test(t)) lines.push(`    await ${locator}.uncheck();`);
    if (/\.focus\(\)/.test(t)) lines.push(`    await ${locator}.focus();`);
    if (/\.blur\(\)/.test(t)) lines.push(`    await ${locator}.blur();`);
    if (/\.scrollIntoView\(\)/.test(t)) lines.push(`    await ${locator}.scrollIntoViewIfNeeded();`);
    if (/\.submit\(\)/.test(t)) lines.push(`    await ${locator}.press('Enter');`);
    if (/\.select\(/.test(t)) {
      const vm = t.match(/\.select\(['"`]([^'"`]*)['"`]\)/);
      lines.push(`    await ${locator}.selectOption('${vm ? vm[1] : ''}');`);
    }
    if (/\.trigger\(/.test(t)) {
      const vm = t.match(/\.trigger\(['"`]([^'"`]+)['"`]\)/);
      lines.push(`    await ${locator}.dispatchEvent('${vm ? vm[1] : 'click'}');`);
    }

    // assertions
    const shouldM = t.match(/\.should\(['"`]([^'"`]+)['"`](?:,\s*['"`]([^'"`]*)['"`](?:,\s*['"`]([^'"`]*)['"`])?)?\)/);
    if (shouldM) {
      const [, ass, val, extra] = shouldM;
      lines.push(convertAssertion(locator, ass, val, extra));
      const andM = t.match(/\.and\(['"`]([^'"`]+)['"`](?:,\s*['"`]([^'"`]*)['"`])?\)/);
      if (andM) lines.push(convertAssertion(locator, andM[1], andM[2]));
    }

    if (lines.length === 0) lines.push(`    const ${conv.name} = ${locator};`);
    return lines.join('\n');
  }

  // alias reference
  const aliasRef = t.match(/cy\.get\(['"`]@(\w+)['"`]\)/);
  if (aliasRef) {
    const name = aliasRef[1];
    const resolved = aliasMap.get(name) || `${name}Locator`;
    const lines = [];
    if (/\.click\(\)/.test(t)) lines.push(`    await ${resolved}.click();`);
    if (/\.type\(/.test(t)) {
      const vm = t.match(/\.type\(['"`]([^'"`]*)['"`]\)/);
      lines.push(`    await ${resolved}.fill('${vm ? vm[1] : ''}');`);
    }
    return lines.length ? lines.join('\n') : `    // @${name} alias action — convert manually`;
  }

  // skip structural tokens
  if (/^[{}()];?$/.test(t) || t === '') return null;

  // unhandled cy.* 
  if (/cy\./.test(t)) {
    warns.push(`Unhandled: ${t.slice(0, 60)}`);
    return `    // TODO: ${t}`;
  }

  return '  ' + t;
}

function convertCypressToPlaywright(source, generatePOM) {
  const warns = [];
  const selectors = new Map();
  const aliasMap = new Map();
  const lines = source.split('\n');
  const out = [];
  let depth = 0;
  const HOOKS = { beforeEach: 'test.beforeEach', before: 'test.beforeAll', afterEach: 'test.afterEach', after: 'test.afterAll' };

  const ind = (d) => '  '.repeat(Math.max(0, d));

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();

    const describeM = t.match(/^(describe|context)\s*\(\s*['"`](.+?)['"`]/);
    const itM = t.match(/^(it|test|specify)\s*\(\s*['"`](.+?)['"`]/);
    const hookM = t.match(/^(beforeEach|before|afterEach|after)\s*\(/);

    if (describeM) {
      out.push(`${ind(depth)}test.describe('${describeM[2]}', () => {`);
      depth++;
    } else if (itM) {
      out.push(`\n${ind(depth)}test('${itM[2]}', async ({ page }) => {`);
      depth++;
    } else if (hookM) {
      out.push(`\n${ind(depth)}${HOOKS[hookM[1]]}(async ({ page }) => {`);
      depth++;
    } else if (t === '})' || t === '});' || t === '}),' || t === ');') {
      depth = Math.max(0, depth - 1);
      out.push(`${ind(depth)}});`);
    } else if (t === '{' || t === '}' || t === '' || t === ')') {
      // skip bare structural tokens
    } else {
      const converted = convertCypressLine(raw, warns, selectors, aliasMap);
      if (converted !== null) out.push(converted);
    }
  }

  const header = `import { test, expect } from '@playwright/test';\n\n`;
  const testCode = header + out.join('\n');

  let pomCode = '';
  if (generatePOM && selectors.size > 0) {
    const descM = source.match(/describe\(['"`]([^'"`]+)['"`]/);
    const title = descM ? descM[1].replace(/\s+(page|tests?|spec)$/i,'').trim() : 'Generic';
    const className = title.split(/\s+/).map(w => w[0].toUpperCase() + w.slice(1)).join('') + 'Page';
    const props = [...selectors.entries()].map(([, c]) =>
      `  readonly ${c.name} = ${c.call.replace('page.', 'this.page.')};`
    ).join('\n');
    pomCode = `import { Page, Locator } from '@playwright/test';\nimport { BasePage } from './base-page';\n\nexport class ${className} extends BasePage {\n${props}\n\n  constructor(page: Page) {\n    super(page);\n  }\n\n  async goto(): Promise<void> {\n    await this.page.goto('/');\n  }\n}\n`;
  }

  const cmdCount = (source.match(/cy\./g) || []).length;
  const todoCount = (testCode.match(/\/\/ TODO/g) || []).length;

  return { testCode, pomCode, warns, cmdCount, todoCount };
}

function toCamel(s) {
  return (s || '')
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase())
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 40) || 'element';
}
