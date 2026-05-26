// app.js — UI controller

let direction = 'cy-to-pw'; // 'cy-to-pw' | 'pw-to-cy'
let pomEnabled = false;
let activeTab = 'test';
let currentOutput = '';
let currentPom = '';

// ── DIRECTION ──────────────────────────────────────────────

function swapDirection() {
  // Toggle direction
  direction = direction === 'cy-to-pw' ? 'pw-to-cy' : 'cy-to-pw';
  
  const btn = document.getElementById('swap-btn');
  btn.classList.add('flipping');
  setTimeout(() => btn.classList.remove('flipping'), 350);

  // Capture existing output if present
  const outputToMove = currentOutput;

  // Reset UI components
  clearAll();
  updateDirectionUI();

  // If there was output, move it to input and refresh stats
  if (outputToMove) {
    const inputArea = document.getElementById('input-area');
    inputArea.value = outputToMove;
    updateLeftStats();
  }
}

function updateDirectionUI() {
  const isCyToPW = direction === 'cy-to-pw';

  // Update chips
  const sourceChip = document.getElementById('source-chip');
  const targetChip = document.getElementById('target-chip');

  sourceChip.className = `logo-chip ${isCyToPW ? 'cy' : 'pw'}`;
  targetChip.className = `logo-chip ${isCyToPW ? 'pw' : 'cy'}`;

  // Update chip contents with external icons
  sourceChip.innerHTML = `${getIcon(isCyToPW ? 'cypress' : 'playwright')}<span>${isCyToPW ? 'Cypress' : 'Playwright'}</span>`;
  targetChip.innerHTML = `${getIcon(isCyToPW ? 'playwright' : 'cypress')}<span>${isCyToPW ? 'Playwright' : 'Cypress'}</span>`;

  // Update pane labels
  const leftLabel = document.getElementById('left-label');
  const rightLabel = document.getElementById('right-label');
  leftLabel.className = `pane-label ${isCyToPW ? 'cy' : 'pw'}`;
  rightLabel.className = `pane-label ${isCyToPW ? 'pw' : 'cy'}`;
  
  document.getElementById('left-title').textContent = isCyToPW ? 'Cypress input' : 'Playwright input';
  document.getElementById('right-title').textContent = isCyToPW ? 'Playwright output' : 'Cypress output';

  // Convert button style
  const btn = document.getElementById('convert-btn');
  btn.className = `btn-primary ${isCyToPW ? '' : 'to-pw'}`;
  document.getElementById('convert-label').textContent = 'Convert →';

  // Update examples
  updateExamplePills();

  // Update placeholder
  document.getElementById('input-area').placeholder = isCyToPW
    ? `Paste your Cypress test(s) here…`
    : `Paste your Playwright test(s) here…`;

  // POM toggle visibility
  const pomToggle = document.getElementById('pom-toggle-wrap');
  if (pomToggle) pomToggle.style.display = isCyToPW ? 'flex' : 'none';
}

function updateExamplePills() {
  const bar = document.getElementById('examples-bar');
  const isCyToPW = direction === 'cy-to-pw';
  const examples = [
    { key: 'login', label: '🔐 Login' },
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'form', label: '📝 Form' },
    { key: 'navigation', label: '🧭 Navigation' },
    { key: 'api', label: '⚡ API' },
  ];
  bar.innerHTML = `<span class="examples-label">Examples</span>` +
    examples.map(e => `<button class="example-pill${isCyToPW ? '' : ' to-pw'}" onclick="loadExample('${e.key}')">${e.label}</button>`).join('');
}

function getIcon(type) {
  if (type === 'cypress') {
    return `<img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/cypress.png" alt="Cypress" style="width:14px; height:14px; filter: brightness(0) invert(1);">`;
  }
  return `<img src="https://icon.icepanel.io/Technology/svg/Playwrite.svg" alt="Playwright" style="width:14px; height:14px;">`;
}

// ── EXAMPLES ───────────────────────────────────────────────

function loadExample(key) {
  const examples = direction === 'cy-to-pw' ? CYPRESS_EXAMPLES : PLAYWRIGHT_EXAMPLES;
  const code = examples[key];
  if (!code) return;
  document.getElementById('input-area').value = code;
  clearOutput();
  updateLeftStats();
  document.getElementById('input-area').focus();
}

// ── POM TOGGLE ─────────────────────────────────────────────

function togglePOM() {
  pomEnabled = !pomEnabled;
  document.getElementById('pom-toggle').className = `toggle ${pomEnabled ? 'on' : ''}`;
}

// ── CONVERT ───────────────────────────────────────────────

function convert() {
  const source = document.getElementById('input-area').value.trim();
  
  // Validation: Nothing to convert
  if (!source) {
    alert("Nothing to convert!");
    return;
  }

  const t0 = Date.now();

  let result;
  if (direction === 'cy-to-pw') {
    result = convertCypressToPlaywright(source, pomEnabled);
  } else {
    result = convertPlaywrightToCypress(source);
  }

  const { testCode, pomCode, warns, cmdCount, todoCount } = result;
  currentOutput = testCode;
  currentPom = pomCode;

  // Output
  const outputEl = document.getElementById('output-area');
  const placeholder = document.getElementById('output-placeholder');
  outputEl.textContent = testCode;
  outputEl.style.display = 'block';
  placeholder.style.display = 'none';

  // POM tabs
  const tabStrip = document.getElementById('tab-strip');
  if (pomEnabled && pomCode && direction === 'cy-to-pw') {
    tabStrip.classList.add('visible');
  } else {
    tabStrip.classList.remove('visible');
    activeTab = 'test';
  }

  // Handle Unhandled Items Section
  const unhandledSection = document.querySelector('.unhandled-section');
  const unhandledList = document.getElementById('unhandled-list');
  
  if (warns && warns.length > 0) {
    unhandledSection.style.display = 'flex';
    unhandledList.innerHTML = warns.map(w => 
      `<div class="warn-row" style="margin-bottom: 4px; border-bottom:1px solid #eee; padding: 2px 0;">⚠ ${w}</div>`
    ).join('');
  } else {
    unhandledSection.style.display = 'none';
  }

  // Stats
  const rightStats = document.getElementById('right-stats');
  rightStats.style.display = 'flex';
  const outLines = testCode.split('\n').length;
  document.getElementById('stat-out-lines').textContent = outLines;
  document.getElementById('stat-converted').textContent = Math.max(0, cmdCount - warns.length);
  document.getElementById('stat-todos').textContent = todoCount;
  document.getElementById('stat-ms').textContent = Date.now() - t0;

  // Right gutter
  updateGutter('right-gutter', testCode);
}

// ── CLEAR ─────────────────────────────────────────────────

function clearOutput() {
  currentOutput = '';
  currentPom = '';
  document.getElementById('output-area').style.display = 'none';
  document.getElementById('output-area').textContent = '';
  document.getElementById('output-placeholder').style.display = 'flex';
  document.getElementById('right-stats').style.display = 'none';
  document.getElementById('tab-strip').classList.remove('visible');
  document.getElementById('right-gutter').innerHTML = '';
  
  // Hide Unhandled Section on Clear
  const unhandledSection = document.querySelector('.unhandled-section');
  if (unhandledSection) unhandledSection.style.display = 'none';
  
  activeTab = 'test';
}

function clearInput() {
  document.getElementById('input-area').value = '';
  document.getElementById('left-stats').style.display = 'none';
  document.getElementById('left-gutter').innerHTML = '';
}

function clearAll() {
  clearInput();
  clearOutput();
}

// ── COPY ──────────────────────────────────────────────────

function copyOutput(btn) {
  const text = activeTab === 'pom' ? currentPom : currentOutput;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!`;
    btn.classList.add('copy-ok');
    if (direction === 'pw-to-cy') btn.classList.add('pw');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('copy-ok', 'pw');
    }, 1800);
  });
}

// ── TABS ──────────────────────────────────────────────────

function switchTab(name, el) {
  activeTab = name;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');

  const outputEl = document.getElementById('output-area');
  const content = name === 'pom' ? currentPom : currentOutput;
  outputEl.textContent = content;
  updateGutter('right-gutter', content);
}

// ── GUTTERS ───────────────────────────────────────────────

function updateGutter(id, code) {
  const gutter = document.getElementById(id);
  if (!gutter) return;
  const count = (code || '').split('\n').length;
  gutter.innerHTML = Array.from({ length: count }, (_, i) =>
    `<div class="line-num">${i + 1}</div>`
  ).join('');
}

function updateLeftStats() {
  const val = document.getElementById('input-area').value;
  const lines = val.split('\n').length;
  const cmds = (val.match(/cy\.|await page\.|await expect\(/g) || []).length;
  const statsEl = document.getElementById('left-stats');
  if (val.trim()) {
    statsEl.style.display = 'flex';
    document.getElementById('stat-lines').textContent = lines;
    document.getElementById('stat-cmds').textContent = cmds;
  } else {
    statsEl.style.display = 'none';
  }
  updateGutter('left-gutter', val);
}

// ── SCROLL SYNC ───────────────────────────────────────────

function syncGutterScroll(textareaId, gutterId) {
  const ta = document.getElementById(textareaId);
  const gutter = document.getElementById(gutterId);
  if (!ta || !gutter) return;
  ta.addEventListener('scroll', () => {
    gutter.scrollTop = ta.scrollTop;
  });
}

function syncOutputScroll() {
  const output = document.getElementById('output-area');
  const gutter = document.getElementById('right-gutter');
  if (!output || !gutter) return;
  output.addEventListener('scroll', () => {
    gutter.scrollTop = output.scrollTop;
  });
}

// ── KEYBOARD SHORTCUT ─────────────────────────────────────

document.getElementById('input-area').addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    convert();
  }
});

document.getElementById('input-area').addEventListener('input', updateLeftStats);

// ── INIT ──────────────────────────────────────────────────

updateDirectionUI();
syncGutterScroll('input-area', 'left-gutter');
syncOutputScroll();
