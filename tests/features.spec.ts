/**
 * Sparkly E2E feature tests
 * Covers the four newly implemented features:
 *   1. French translation of Job Extras (LogJob page)
 *   2. Extras checkbox shown & editable in AllJobs modify modal
 *   3. Invoice PDF download button opens a new window
 *   4. Payroll — add a new employee without a Sparkly account
 */

import { test, expect, Page } from '@playwright/test';

// ─── Shared helpers ──────────────────────────────────────────────────────────

async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#identifier').fill(username);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  // Wait for successful redirect to app dashboard
  await page.waitForURL('**/app**', { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
}

// ─── Test 1: French translations for Job Extras ───────────────────────────────

test('Job extras show in French for a French-language owner', async ({ page }) => {
  // marie_tremblay is a QC (Quebec) account owner
  await login(page, 'marie_tremblay', 'Demo@123456');

  // Force language to 'fr' in the Zustand-persisted localStorage key
  await page.evaluate(() => {
    const raw = localStorage.getItem('sparkly-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.state.language = 'fr';
      localStorage.setItem('sparkly-auth', JSON.stringify(parsed));
    }
  });

  // Navigate to the Log Job page (reload to pick up the new language)
  await page.goto('/app/log-job');
  await page.waitForLoadState('networkidle');

  // The "Extras" section label should appear in French
  await expect(page.getByText('Suppléments')).toBeVisible({ timeout: 10_000 });

  // Several extras should be shown in French (not English)
  await expect(page.getByLabel('Zone animaux')).toBeVisible();
  await expect(page.getByLabel('Intérieur réfrigérateur')).toBeVisible();
  await expect(page.getByLabel('Escaliers / marches')).toBeVisible();
  await expect(page.getByLabel('Fenêtres intérieures')).toBeVisible();

  // English labels must NOT appear in the extras grid
  await expect(page.getByLabel('Pets area')).not.toBeVisible();
  await expect(page.getByLabel('Inside Fridge')).not.toBeVisible();
});

// ─── Test 2: Extras are editable in AllJobs modify modal ──────────────────────

test('Extras checkbox list appears in AllJobs edit modal and can be saved', async ({ page }) => {
  // Use EN owner so we can assert English strings
  await login(page, 'james_wilson', 'Demo@123456');

  await page.goto('/app/jobs');
  await page.waitForLoadState('networkidle');

  // Click the pencil (edit) button on the first job row
  const editBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
  // More reliable: target the Pencil icon button in the actions column
  const firstEditBtn = page.locator('tbody tr').first().locator('button').nth(1);
  await firstEditBtn.click();

  // The edit form should appear with the "Extras" label
  await expect(page.getByText('Extras')).toBeVisible({ timeout: 10_000 });

  // The first extra checkbox "Pets area" must be present in the edit form
  const petsCheckbox = page.getByLabel('Pets area');
  await expect(petsCheckbox).toBeVisible();

  // Toggle "Inside Fridge" on
  const fridgeCheckbox = page.getByLabel('Inside Fridge');
  const wasChecked = await fridgeCheckbox.isChecked();
  await fridgeCheckbox.click();
  // After click, state should be toggled
  await expect(fridgeCheckbox).toBeChecked({ checked: !wasChecked });

  // Save the form
  await page.getByRole('button', { name: /save|enregistrer/i }).click();
  // The edit form should close (no "Extras" label visible at top level)
  await expect(page.getByRole('heading', { name: /edit job|modifier le travail/i })).not.toBeVisible({ timeout: 10_000 });
});

// ─── Test 3: Invoice PDF download opens a new window ──────────────────────────

test('Invoice detail modal shows Download PDF button that opens a new window', async ({ page, context }) => {
  await login(page, 'james_wilson', 'Demo@123456');

  await page.goto('/app/invoices');
  await page.waitForLoadState('networkidle');

  // Click "View" (viewDetails) button on the first invoice
  const viewBtn = page.getByRole('button', { name: /view|voir/i }).first();
  await viewBtn.click();

  // Modal should appear with "Invoice Details" heading
  await expect(page.getByRole('heading', { name: /invoice details|détails de la facture/i })).toBeVisible({ timeout: 10_000 });

  // Wait for invoice data to load (Download PDF button appears only after invoice loaded)
  const downloadBtn = page.getByRole('button', { name: /download pdf|télécharger pdf/i });
  await expect(downloadBtn).toBeVisible({ timeout: 15_000 });

  // Click and capture the new window that opens
  const [popup] = await Promise.all([
    context.waitForEvent('page', { timeout: 15_000 }),
    downloadBtn.click(),
  ]);

  // The popup should open
  expect(popup).toBeTruthy();

  // Wait for the popup to load enough to have the INVOICE heading
  await popup.waitForLoadState('domcontentloaded', { timeout: 15_000 });
  const popupContent = await popup.content();
  expect(popupContent).toContain('INVOICE');

  await popup.close();
});

// ─── Test 4: Payroll — add new employee without a Sparkly account ─────────────

test('Payroll form allows adding a new name-only employee and shows them in the table', async ({ page }) => {
  // james_wilson is an ON Business-plan account owner with access to Payroll
  await login(page, 'james_wilson', 'Demo@123456');

  await page.goto('/app/payroll');
  await page.waitForLoadState('networkidle');

  // Click the "Run Payroll Estimate" button (or "Add Employee" / plus button)
  const runPayrollBtn = page.getByRole('button', { name: /run payroll estimate|add employee|ajouter employé/i }).first();
  await runPayrollBtn.click();

  // The payroll form modal should open — use heading role to avoid strict mode violation
  // (there are both a button and an h2 with the same text)
  await expect(page.getByRole('heading', { name: 'Run Payroll Estimate' })).toBeVisible({ timeout: 10_000 });

  // Switch to "Add New Employee (no account)" mode
  await page.getByRole('button', { name: /add new employee|ajouter nouvel employé/i }).click();

  // The employee name text input should appear
  const nameInput = page.getByPlaceholder(/jean-pierre tremblay|employee name/i);
  await expect(nameInput).toBeVisible({ timeout: 5_000 });

  // Type a unique employee name
  const testEmployeeName = `Test Employee ${Date.now()}`;
  await nameInput.fill(testEmployeeName);

  // Fill required payroll fields using input ordering inside the form
  // (Hours is the 5th number input after Pay Period Start, Pay Period End, hours, rate...)
  // Use nth-of-type selectors inside the visible modal
  const modal = page.locator('.fixed.inset-0.z-50').last();

  // Hours input — fill by locating the input next to its "Hours" label
  const hoursLabel = modal.getByText('Hours', { exact: true }).last();
  const hoursInput = hoursLabel.locator('..').locator('input');
  await hoursInput.clear();
  await hoursInput.fill('80');

  const rateLabel = modal.getByText('Hourly Rate ($)', { exact: true }).last();
  const rateInput = rateLabel.locator('..').locator('input');
  await rateInput.clear();
  await rateInput.fill('20');

  // Submit the form
  await page.getByRole('button', { name: /^create$|^créer$/i }).click();

  // Wait for modal to close (form submitted)
  await expect(page.getByRole('heading', { name: 'Run Payroll Estimate' })).not.toBeVisible({ timeout: 15_000 });

  // The new employee should appear in the payroll table
  await expect(page.getByRole('cell', { name: testEmployeeName })).toBeVisible({ timeout: 15_000 });
});
