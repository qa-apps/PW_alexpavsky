import { test, expect } from '../fixtures/base';

test.describe('JSON Formatter and Diff Checker', () => {
  test('should pretty-print valid JSON', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openJsonFormatter();
    await expect(labPage.jsonModal).toHaveClass(/active/);
    await labPage.jsonInput.fill('{"name":"Alex","role":"QA"}');
    await labPage.jsonFormatBtn.click();
    await expect(labPage.jsonOutput).toContainText('"name": "Alex"');
  });

  test('should compare two text inputs and render diff output', async ({ labPage }) => {
    await labPage.goto();
    await labPage.openDiffChecker();
    await expect(labPage.diffModal).toHaveClass(/active/);
    await labPage.diffLeft.fill('line one\nline two');
    await labPage.diffRight.fill('line one\nline three');
    await labPage.diffCompareBtn.click();
    await expect(labPage.diffOutput).toContainText(/line (two|three)/);
  });
});
