/**
 * chatbotRichInput.spec.ts
 *
 * Verifies the rich-input affordances of the chatbot widget:
 *   1. Mic button exists, is visible, is clickable, and is wired to the
 *      browser microphone permission (we don't actually record audio in
 *      headless — we assert the click triggers the speech-recognition
 *      path without throwing, and that the browser permission flow can
 *      be granted upfront).
 *   2. File attachment via the hidden #chat-file-input (the click-to-
 *      browse path). After upload + send, the bot must produce a
 *      grounded reply that references content from the file (not a
 *      generic "I received your message").
 *   3. Image vision: upload a small PNG with a distinguishable feature
 *      (a written word). Bot reply should reference that word or its
 *      visual property.
 *   4. Drag-and-drop fallback: simulate a real drag event with a
 *      DataTransfer on the chat window. Assert that the file appears
 *      in the attachments tray.
 *
 * All marked @upstream because LLM responses are non-deterministic.
 */

import { test, expect } from '../utils/fixtures';
import * as fs from 'node:fs';
import * as path from 'node:path';

const BASE_URL = process.env.SITE_URL || 'https://www.alexpavsky.com';

async function openChatAndAccept(page: any) {
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    const t = document.getElementById('chat-teaser'); if (t) t.remove();
  });
  await page.locator('#chat-toggle').click({ force: true });
  await page.locator('#chat-window').waitFor({ state: 'visible', timeout: 10_000 });
  const cb = page.locator('#chat-consent-cb');
  if (await cb.isVisible().catch(() => false)) {
    await cb.evaluate((el: HTMLInputElement) => {
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#chat-consent-btn').click({ force: true });
  }
}

test.describe('Chatbot rich-input @upstream', () => {

  test('mic button exists, is enabled, and is reachable by keyboard', async ({ page }) => {
    await openChatAndAccept(page);
    const mic = page.locator('#chat-mic-btn');
    await expect(mic, 'mic button must exist').toBeVisible();
    await expect(mic).toBeEnabled();
    // aria-label or title must mention voice — accessibility check.
    const labelOrTitle = await mic.evaluate((el) =>
      (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || ''),
    );
    expect(labelOrTitle.toLowerCase(), 'mic button must self-describe as voice/microphone')
      .toMatch(/voice|microphone|speak|listen/);
    // Click must not throw and must toggle some visible UI state — class
    // change, attribute flip — even when the browser blocks the actual
    // permission. We only verify the handler exists and runs.
    const before = await mic.evaluate((el) => el.className);
    await mic.click({ trial: false }).catch(() => undefined);
    await page.waitForTimeout(400);
    const after = await mic.evaluate((el) => el.className);
    // Accept either: class changed (recording/active state), OR a
    // permission-denied message bubbled into chat. Both prove the
    // handler ran. Failure mode = no change AND no message AND no error.
    const classChanged = before !== after;
    const errorBubbled = await page.locator('.bot-message, .chat-error').count() > 0;
    expect(classChanged || errorBubbled, 'mic click must trigger SOME observable effect').toBe(true);
  });

  test('file upload via #chat-file-input — bot answers grounded on file content', async ({ page }, testInfo) => {
    await openChatAndAccept(page);

    // Build a tiny text file with a UNIQUE marker so we can assert
    // grounding without ambiguity. We use a short, single-token-friendly
    // discriminator ("XYZZY") that the model can't plausibly have seen
    // in training data outside the original Adventure game reference,
    // combined with random suffix so logs can distinguish runs. The
    // assertion only requires the stable discriminator to appear.
    const discriminator = 'XYZZY';
    const marker = `${discriminator}-${Date.now().toString(36).slice(-6)}`;
    const fileBody = `This is a test document for the QA automation suite.\n\n` +
      `The unique magic word is: ${marker}\n\nThe document discusses ferret biology, ` +
      `the migration patterns of arctic terns, and a fictional API called QuokkaQL. ` +
      `None of this content is real.`;
    const filePath = testInfo.outputPath('grounding-test.txt');
    await fs.promises.writeFile(filePath, fileBody, 'utf8');

    // Use the hidden file input directly (click-to-browse path).
    await page.setInputFiles('#chat-file-input', filePath);
    // Attachment chip should appear before we send.
    await page.locator('.chat-attachment-chip, .chat-attachment-card').first()
      .waitFor({ state: 'visible', timeout: 8_000 });

    // Ask the model to repeat the unique marker if it can see the file.
    await page.locator('#chat-input').fill(
      `Please look at the attached file and respond with ONLY the unique magic word from inside it. Do not paraphrase it.`,
    );
    await page.locator('#chat-form').evaluate((f: HTMLFormElement) => f.requestSubmit());

    const finished = page.locator('.bot-message:last-child .message-content:not(.typing-indicator)');
    await finished.waitFor({ state: 'visible', timeout: 60_000 });
    const reply = (await finished.innerText()) || '';

    // PASS = bot reply contains the stable discriminator from the file.
    // FAIL = "I received the attachment, but the analysis service is
    //         temporarily unavailable right now" (the generic fallback
    //         returned when grounding is broken).
    expect(reply, `bot reply must reference the discriminator from the uploaded file. Reply: ${reply.slice(0, 400)}`)
      .toContain(discriminator);
  });

  test('image vision — bot describes a feature only visible in the image', async ({ page }, testInfo) => {
    await openChatAndAccept(page);

    // 1×1 PNG with a known colour is too trivial for the vision model;
    // instead build a small 64×64 PNG with a solid red square via Canvas
    // OffscreenCanvas — done in the browser to avoid Node image deps.
    const imgPath = testInfo.outputPath('red-square.png');
    const pngBuf = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 64, 64);
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png'),
      );
      const ab = await blob.arrayBuffer();
      return Array.from(new Uint8Array(ab));
    });
    await fs.promises.writeFile(imgPath, Buffer.from(pngBuf));

    await page.setInputFiles('#chat-file-input', imgPath);
    await page.locator('.chat-attachment-chip, .chat-attachment-card').first()
      .waitFor({ state: 'visible', timeout: 8_000 });

    await page.locator('#chat-input').fill(
      'What is the dominant colour in the attached image? Answer with a single colour word.',
    );
    await page.locator('#chat-form').evaluate((f: HTMLFormElement) => f.requestSubmit());

    const finished = page.locator('.bot-message:last-child .message-content:not(.typing-indicator)');
    await finished.waitFor({ state: 'visible', timeout: 60_000 });
    const reply = (await finished.innerText()) || '';

    expect(reply.toLowerCase(), `vision model must identify the red colour in the image. Reply: ${reply.slice(0, 300)}`)
      .toMatch(/\bred\b/);
  });

  test('drag-and-drop a file onto chat-window adds an attachment chip', async ({ page }, testInfo) => {
    await openChatAndAccept(page);

    // Build the file on disk + read its bytes; we'll synthesise a real
    // DataTransfer with that file and dispatch dragover + drop events.
    const filePath = testInfo.outputPath('drop-test.txt');
    const text = 'Drop-test payload ' + Date.now();
    await fs.promises.writeFile(filePath, text, 'utf8');
    const bytes = Array.from(await fs.promises.readFile(filePath));

    const dropZone = page.locator('#chat-window');
    await expect(dropZone).toBeVisible();

    await dropZone.evaluate(async (el, payload) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(payload.bytes)], payload.name, { type: 'text/plain' });
      dt.items.add(file);
      el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    }, { bytes, name: 'drop-test.txt' });

    // The attachment tray must show a chip representing the dropped file.
    await expect(
      page.locator('.chat-attachment-chip, .chat-attachment-card').first(),
      'drag-drop must surface an attachment chip',
    ).toBeVisible({ timeout: 5_000 });
  });
});
