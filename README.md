## PlayCynk — <span style="color: #00C271;">Cypress</span> ↔ <span style="color: #7B5CF5;">Playwright</span> Converter

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-00C271?style=for-the-badge&logo=vercel)](https://playcynk.vercel.app/)

PlayCynk is a professional-grade migration tool engineered to solve the interoperability challenges between the two most popular E2E testing frameworks. Built to support the evolving needs of modern QA teams, it reduces the manual overhead required to move test suites between Cypress and Playwright.

## The Problem It Solves

Automation engineers often face "framework lock-in" or the need to migrate suites due to changing infrastructure requirements, performance demands, or team standardization. Manual refactoring is error-prone, time-consuming, and disrupts the CI/CD pipeline. PlayCynk automates the structural translation of test commands, ensuring parity while highlighting areas where human intervention is required.

## Usage

Open `index.html` in any modern browser. No server, no build step, no dependencies.

```
open index.html
```

Or serve locally:

```bash
npx serve .
# or
python3 -m http.server 8080
```

## Features

- _Bidirectional_ - Cypress → Playwright and Playwright → Cypress
- _POM generation_ - auto-generates a Page Object class from your selectors (Cypress → Playwright)
- _5 built-in examples_ - Login, Dashboard, Form, Navigation, API requests
- _Live stats_ - command count, conversion rate, TODOs, duration
- _Warnings panel_ - highlights commands that need manual review
- _Line numbers_ - synced gutters on both panes
- _Copy button_ - one click to grab the output
- _Keyboard shortcut_ - `Cmd+Enter` / `Ctrl+Enter` to convert

## Project Structure

The project is organized to separate the UI logic, conversion engines, and styling:

```text
PlayCynk/
├── images/                   # Asset directory for icons/graphics
├── app.js                    # Main UI controller and event handling
├── converter.js              # Shared conversion utilities
├── index.html                # Main application entry point
├── style.css                 # Application styling and layout
├── playwright-to-cypress.js  # Conversion logic for PW to Cypress
├── README.md                 # Project documentation
└── LICENSE                   # Project license (MIT)
```

## Conversion coverage

### <span style="color: #00C271;">Cypress</span> → <span style="color: #7B5CF5;">Playwright</span>

| Cypress                         | Playwright                         |
| ------------------------------- | ---------------------------------- |
| `cy.visit()`                    | `page.goto()`                      |
| `cy.get('[data-cy="x"]')`       | `page.getByTestId('x')`            |
| `cy.get('[data-testid="x"]')`   | `page.getByTestId('x')`            |
| `cy.get('button')`              | `page.getByRole('button')`         |
| `cy.get('[placeholder="..."]')` | `page.getByPlaceholder('...')`     |
| `.type('text')`                 | `.fill('text')`                    |
| `.click()`                      | `.click()`                         |
| `.check()`                      | `.check()`                         |
| `.select('opt')`                | `.selectOption('opt')`             |
| `.scrollIntoView()`             | `.scrollIntoViewIfNeeded()`        |
| `.should('be.visible')`         | `.toBeVisible()`                   |
| `.should('have.text', 'x')`     | `.toHaveText('x')`                 |
| `.should('have.length', 5)`     | `.toHaveCount(5)`                  |
| `.should('have.attr', 'href')`  | `.toHaveAttribute('href')`         |
| `cy.intercept()`                | `page.route() + waitForResponse()` |
| `cy.wait('@alias')`             | `await aliasPromise`               |
| `cy.clearCookies()`             | `page.context().clearCookies()`    |
| `cy.viewport(w, h)`             | `page.setViewportSize({...})`      |
| `cy.reload()`                   | `page.reload()`                    |
| `cy.go('back')`                 | `page.goBack()`                    |

### <span style="color: #7B5CF5;">Playwright</span> → <span style="color: #00C271;">Cypress</span>

| Playwright                      | Cypress                       |
| ------------------------------- | ----------------------------- |
| `page.goto()`                   | `cy.visit()`                  |
| `page.getByTestId('x')`         | `cy.get('[data-cy="x"]')`     |
| `page.getByRole('button')`      | `cy.get('[role="button"]')`   |
| `page.getByText('x')`           | `cy.contains('x')`            |
| `page.getByPlaceholder('x')`    | `cy.get('[placeholder="x"]')` |
| `.fill('text')`                 | `.type('text')`               |
| `.click()`                      | `.click()`                    |
| `.check()`                      | `.check()`                    |
| `expect(...).toBeVisible()`     | `.should('be.visible')`       |
| `expect(...).toHaveText('x')`   | `.should('have.text', 'x')`   |
| `expect(...).toHaveCount(5)`    | `.should('have.length', 5)`   |
| `page.route()`                  | `cy.intercept()`              |
| `page.reload()`                 | `cy.reload()`                 |
| `page.goBack()`                 | `cy.go('back')`               |
| `page.setViewportSize()`        | `cy.viewport()`               |
| `page.context().clearCookies()` | `cy.clearCookies()`           |

## Technical Context

Developed as part of a professional QA toolset, PlayCynk integrates directly into existing workflows to reduce the technical debt associated with cross-framework migration.

## License & Credits

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
