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
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';

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

/**
 * Send a prompt to the open chat and return the NEW bot reply text.
 * Snapshots the bot-message count before submit, then polls until a new
 * bot bubble appears beyond that count, then returns its text. Avoids
 * the race where `.bot-message:last-child` matches the static welcome
 * bubble before the LLM has had a chance to reply.
 */
async function sendAndAwaitNewBotReply(page: any, prompt: string, timeoutMs = 60_000): Promise<string> {
  const botMsgs = page.locator('.bot-message .message-content:not(.typing-indicator)');
  const baseline = await botMsgs.count();
  await page.locator('#chat-input').fill(prompt);
  await page.locator('#chat-form').evaluate((f: HTMLFormElement) => f.requestSubmit());
  await expect.poll(
    async () => await botMsgs.count(),
    { timeout: timeoutMs, intervals: [500, 1000, 2000, 3000] },
  ).toBeGreaterThan(baseline);
  return (await botMsgs.nth(baseline).innerText()) || '';
}

async function makePdfFile(filePath: string, marker: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(
    `Quarterly Q3 2026 report.\nThe unique magic word for this PDF test is: ${marker}\n` +
    `This document covers nothing real — purely a QA fixture for the chatbot's PDF parser.`,
    { x: 50, y: 720, size: 14, font, lineHeight: 20 },
  );
  await fs.promises.writeFile(filePath, await pdf.save());
}

async function makeDocxFile(filePath: string, marker: string) {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun('Internal HR memo — 2026-Q4 draft.')] }),
        new Paragraph({ children: [new TextRun(`Unique magic word for this DOCX test: ${marker}`)] }),
        new Paragraph({ children: [new TextRun('Everything else here is filler for the QA fixture.')] }),
      ],
    }],
  });
  await fs.promises.writeFile(filePath, await Packer.toBuffer(doc));
}

test.describe('Chatbot rich-input @upstream', () => {

  test('mic button click actually starts SpeechRecognition flow', async ({ browser }) => {
    // Headless Chromium has no SpeechRecognition. We polyfill a tracking
    // spy BEFORE page load via addInitScript, so the site's mic handler
    // attaches and we can assert that clicking the button reaches the
    // `recognition.start()` call. Without the polyfill the click is a
    // no-op (site code: `if (micBtn && SpeechRecognition)` early-exits).
    const ctx = await browser.newContext({ permissions: ['microphone'] });
    await ctx.addInitScript(() => {
      (window as any).__micCalls = { start: 0, stop: 0, onstart: 0 };
      class FakeRecognition {
        lang = ''; interimResults = false; maxAlternatives = 1; continuous = false;
        onstart: any = null; onend: any = null; onerror: any = null; onresult: any = null;
        start() {
          (window as any).__micCalls.start++;
          if (this.onstart) { (window as any).__micCalls.onstart++; this.onstart({}); }
        }
        stop() { (window as any).__micCalls.stop++; if (this.onend) this.onend({}); }
      }
      (window as any).SpeechRecognition = FakeRecognition;
      (window as any).webkitSpeechRecognition = FakeRecognition;
    });
    const page = await ctx.newPage();
    await openChatAndAccept(page);

    const mic = page.locator('#chat-mic-btn');
    await expect(mic, 'mic button must exist').toBeVisible();
    await expect(mic).toBeEnabled();
    const labelOrTitle = await mic.evaluate((el) =>
      (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || ''),
    );
    expect(labelOrTitle.toLowerCase(), 'mic button must self-describe as voice/microphone')
      .toMatch(/voice|microphone|speak|listen/);

    await mic.click();
    await page.waitForTimeout(400);

    const calls = await page.evaluate(() => (window as any).__micCalls);
    expect(calls.start, 'click must invoke recognition.start()').toBe(1);
    // mic-btn gains .active class because the site's onstart handler fired.
    await expect(mic).toHaveClass(/active/);

    await ctx.close();
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
    const reply = await sendAndAwaitNewBotReply(
      page,
      `Please look at the attached file and respond with ONLY the unique magic word from inside it. Do not paraphrase it.`,
    );

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

    const reply = await sendAndAwaitNewBotReply(
      page,
      'What is the dominant colour in the attached image? Answer with a single colour word.',
    );

    expect(reply.toLowerCase(), `vision model must identify the red colour in the image. Reply: ${reply.slice(0, 300)}`)
      .toMatch(/\bred\b/);
  });

  test('PDF document — pdf.js parses it and bot answers grounded on its content', async ({ page }, testInfo) => {
    await openChatAndAccept(page);

    const discriminator = 'PINEAPPLE-OBELISK';
    const marker = `${discriminator}-${Date.now().toString(36).slice(-6)}`;
    const filePath = testInfo.outputPath('grounding-test.pdf');
    await makePdfFile(filePath, marker);

    await page.setInputFiles('#chat-file-input', filePath);
    await page.locator('.chat-attachment-chip, .chat-attachment-card').first()
      .waitFor({ state: 'visible', timeout: 10_000 });

    const reply = await sendAndAwaitNewBotReply(
      page,
      'Look inside the attached PDF and reply with ONLY the unique magic word printed in it.',
    );

    expect(reply, `bot reply must reference the PDF discriminator. Reply: ${reply.slice(0, 400)}`)
      .toContain(discriminator);
  });

  test('DOCX document — mammoth.js parses it and bot answers grounded on its content', async ({ page }, testInfo) => {
    await openChatAndAccept(page);

    const discriminator = 'TURNIP-COMPASS';
    const marker = `${discriminator}-${Date.now().toString(36).slice(-6)}`;
    const filePath = testInfo.outputPath('grounding-test.docx');
    await makeDocxFile(filePath, marker);

    await page.setInputFiles('#chat-file-input', filePath);
    await page.locator('.chat-attachment-chip, .chat-attachment-card').first()
      .waitFor({ state: 'visible', timeout: 10_000 });

    const reply = await sendAndAwaitNewBotReply(
      page,
      'Look inside the attached Word document and reply with ONLY the unique magic word printed in it.',
    );

    expect(reply, `bot reply must reference the DOCX discriminator. Reply: ${reply.slice(0, 400)}`)
      .toContain(discriminator);
  });

  test('image vision (text inside image) — bot reads the rendered word', async ({ page }, testInfo) => {
    await openChatAndAccept(page);

    // Render a unique word into a PNG via Canvas — proves the model
    // actually reads visual content, not just identifies colours.
    const word = 'OCTOPUS' + Math.random().toString(36).slice(2, 5).toUpperCase();
    const imgPath = testInfo.outputPath('image-with-text.png');
    const pngBytes = await page.evaluate(async (w) => {
      const c = document.createElement('canvas');
      c.width = 480; c.height = 240;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 480, 240);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 64px Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(w, 240, 120);
      const blob: Blob = await new Promise(r => c.toBlob(b => r(b!), 'image/png'));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, word);
    await fs.promises.writeFile(imgPath, Buffer.from(pngBytes));

    await page.setInputFiles('#chat-file-input', imgPath);
    await page.locator('.chat-attachment-chip, .chat-attachment-card').first()
      .waitFor({ state: 'visible', timeout: 10_000 });

    const reply = await sendAndAwaitNewBotReply(
      page,
      'There is a single word written in the attached image. Reply with ONLY that word, nothing else.',
    );

    // Word starts with stable prefix OCTOPUS. The vision model usually
    // returns it uppercase even when rendered uppercase; allow either.
    expect(reply.toUpperCase(), `vision must read the rendered word from the image. Reply: ${reply.slice(0, 300)}`)
      .toContain('OCTOPUS');
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
