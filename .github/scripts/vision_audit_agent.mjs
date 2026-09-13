#!/usr/bin/env node

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'https://www.alexpavsky.com';
const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const model = process.env.VISION_MODEL || 'qwen3-vl-30b-a3b-screen:latest';
const outputDir = path.resolve(process.env.VISION_AUDIT_OUTPUT_DIR || 'vision-audit');
const screenshotDir = path.join(outputDir, 'screenshots');
const videoDir = path.join(outputDir, 'videos');
const maxSteps = Math.max(3, Math.min(Number(process.env.VISION_AUDIT_MAX_STEPS || 8), 12));
const timeoutMs = Number(process.env.VISION_MODEL_TIMEOUT_MS || 240000);

fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

const report = {
  version: 1,
  started_at: new Date().toISOString(),
  base_url: baseUrl,
  model,
  status: 'running',
  steps: [],
  deterministic_findings: [],
  candidate_findings: [],
  confirmed_findings: [],
  model_usage: { calls: 0, prompt_tokens: 0, completion_tokens: 0, total_latency_ms: 0 },
};

function writeReport() {
  report.finished_at = new Date().toISOString();
  fs.writeFileSync(
    path.join(outputDir, 'vision-audit-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

function clip(value, length = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, length);
}

function parseJsonObject(value) {
  const text = String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return {};
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function askVisionAgent(imagePath, context) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  const prompt = `You are a conservative visual and functional QA agent auditing a public website.

Inspect the screenshot together with the URL, browser evidence, and numbered interactive elements below.
Report only concrete defects visible in the screenshot or directly supported by browser evidence. Do not report
subjective style preferences. Do not infer a broken control that has not been exercised.

Check for: overlap, clipped text, off-screen controls, broken or blank content, unreadable contrast, incoherent
layout, error states, unexpected navigation, and controls that did not react. Then choose one safe next action
that expands coverage. Never submit a form, enter credentials, make a purchase, delete data, or leave the site's
origin. A link marked safe=false is merely outside the automation boundary; it is not a website defect. Content
below the viewport is normal and is not clipped or missing. Prefer an unvisited navigation item, modal, tab, or
accordion over repeated scrolling.

Return only JSON with this shape:
{
  "summary": "one concise sentence",
  "visual_findings": [{"title":"...","severity":"low|medium|high","confidence":0.0,"evidence":"..."}],
  "functional_findings": [{"title":"...","severity":"low|medium|high","confidence":0.0,"evidence":"..."}],
  "next_action": {"kind":"click|scroll|finish","element_id":"v1 or empty","direction":"down|up","reason":"..."}
}

Current evidence:
${JSON.stringify(context, null, 2)}`;

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        keep_alive: '15m',
        messages: [{
          role: 'user',
          content: prompt,
          images: [fs.readFileSync(imagePath).toString('base64')],
        }],
        options: { temperature: 0.0, num_predict: 1200 },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}: ${clip(await response.text(), 500)}`);
    }
    const payload = await response.json();
    const latency = Date.now() - started;
    report.model_usage.calls += 1;
    report.model_usage.prompt_tokens += Number(payload.prompt_eval_count || 0);
    report.model_usage.completion_tokens += Number(payload.eval_count || 0);
    report.model_usage.total_latency_ms += latency;
    const decision = parseJsonObject(payload.message?.content);
    if (!decision.next_action || typeof decision.next_action !== 'object') {
      throw new Error('Vision model returned no structured next_action');
    }
    return { decision, latency_ms: latency };
  } finally {
    clearTimeout(timer);
  }
}

async function collectInteractiveElements(page) {
  return page.locator('a[href], button, [role="button"], [role="link"], summary').evaluateAll((elements) => {
    document.querySelectorAll('[data-vision-agent-id]').forEach((element) => {
      element.removeAttribute('data-vision-agent-id');
    });
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && box.width > 2 && box.height > 2;
    };
    const output = [];
    for (const element of elements) {
      if (!visible(element) || element.hasAttribute('disabled')) continue;
      const tag = element.tagName.toLowerCase();
      const type = String(element.getAttribute('type') || '').toLowerCase();
      const inForm = Boolean(element.closest('form'));
      const href = element instanceof HTMLAnchorElement ? element.href : '';
      const sameOrigin = !href || new URL(href, window.location.href).origin === window.location.origin;
      const safe = sameOrigin && !(tag === 'button' && inForm && type !== 'button');
      const label = (
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent ||
        ''
      ).replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!label && !href) continue;
      const id = `v${output.length + 1}`;
      element.setAttribute('data-vision-agent-id', id);
      output.push({ id, tag, label, href, safe });
      if (output.length >= 35) break;
    }
    return output;
  });
}

function normalizeFinding(finding, kind, step, screenshot, url) {
  if (!finding || typeof finding !== 'object') return null;
  const severity = ['low', 'medium', 'high'].includes(finding.severity)
    ? finding.severity
    : 'low';
  const confidence = Number(finding.confidence || 0);
  const title = clip(finding.title, 160);
  const evidence = clip(finding.evidence, 500);
  if (!title || !evidence) return null;
  return { kind, title, severity, confidence, evidence, step, screenshot, url };
}

function findingKey(finding) {
  return `${finding.kind}:${finding.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;
}

function isKnownNonDefect(finding) {
  const text = `${finding.title} ${finding.evidence}`.toLowerCase();
  return [
    'external link', 'unsafe content', 'marked as unsafe', 'third-party',
    'below the fold', 'below the viewport', 'need to scroll', 'scroll down',
    'section is not fully visible', 'content is not fully visible',
  ].some((phrase) => text.includes(phrase));
}

function isConcreteVisualDefect(finding) {
  const text = `${finding.title} ${finding.evidence}`.toLowerCase();
  return [
    'overlap', 'clipped text', 'unreadable', 'blank content', 'missing image',
    'broken image', 'horizontal overflow', 'error message', 'distorted',
  ].some((phrase) => text.includes(phrase));
}

function chooseCoverageOverride(action, elements, actionHistory, scrollStreak) {
  if (action?.kind !== 'scroll' || scrollStreak < 2) return action;
  const preferred = elements.find((element) => {
    const key = `${element.label}|${element.href}`;
    if (!element.safe || actionHistory.has(key)) return false;
    return element.tag === 'button' || element.href.includes('#');
  });
  if (!preferred) return action;
  return {
    kind: 'click',
    element_id: preferred.id,
    reason: 'Deterministic coverage override after repeated scrolling.',
  };
}

async function executeAction(page, action, elements, actionHistory, allowedOrigins) {
  if (!action || action.kind === 'finish') return { executed: false, finished: true };
  if (action.kind === 'scroll') {
    const direction = action.direction === 'up' ? -1 : 1;
    await page.mouse.wheel(0, direction * Math.round((await page.viewportSize()).height * 0.8));
    await page.waitForTimeout(700);
    return { executed: true, action: `scroll:${direction > 0 ? 'down' : 'up'}` };
  }
  if (action.kind !== 'click') {
    return { executed: false, rejected: 'unsupported action kind' };
  }

  const element = elements.find((candidate) => candidate.id === action.element_id);
  if (!element || !element.safe) {
    return { executed: false, rejected: 'unknown or unsafe element' };
  }
  const key = `${element.label}|${element.href}`;
  if (actionHistory.has(key)) {
    return { executed: false, rejected: 'action already exercised' };
  }
  actionHistory.add(key);

  const previousUrl = page.url();
  await page.locator(`[data-vision-agent-id="${element.id}"]`).click({ timeout: 10000 });
  await page.waitForTimeout(900);
  const currentUrl = page.url();
  if (!allowedOrigins.has(new URL(currentUrl).origin)) {
    await page.goto(previousUrl, { waitUntil: 'domcontentloaded' });
    return { executed: false, rejected: 'external navigation was rolled back' };
  }
  return {
    executed: true,
    action: `click:${element.id}`,
    label: element.label,
    previous_url: previousUrl,
    current_url: currentUrl,
  };
}

async function main() {
  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];
  const actionHistory = new Set();
  const findingMap = new Map();
  let lastActionResult = { executed: false, action: 'initial page load' };
  let scrollStreak = 0;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const video = page.video();

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(clip(message.text(), 500));
  });
  page.on('pageerror', (error) => pageErrors.push(clip(error.message, 500)));
  page.on('response', (response) => {
    if (response.status() >= 500) {
      failedResponses.push({ status: response.status(), url: response.url() });
    }
  });
  page.on('popup', async (popup) => popup.close().catch(() => {}));

  let initialStatus = 0;
  try {
    const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    initialStatus = response?.status() || 0;
    await page.waitForTimeout(1200);
    const allowedOrigins = new Set([new URL(baseUrl).origin, new URL(page.url()).origin]);

    for (let stepNumber = 1; stepNumber <= maxSteps; stepNumber += 1) {
      const screenshot = path.join(screenshotDir, `step-${String(stepNumber).padStart(2, '0')}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      const elements = await collectInteractiveElements(page);
      const browserEvidence = {
        initial_http_status: initialStatus,
        console_errors: [...new Set(consoleErrors)].slice(-8),
        page_errors: [...new Set(pageErrors)].slice(-8),
        server_errors: failedResponses.slice(-8),
      };
      const contextForModel = {
        step: stepNumber,
        max_steps: maxSteps,
        url: page.url(),
        title: await page.title(),
        browser_evidence: browserEvidence,
        previous_action_result: lastActionResult,
        already_exercised: [...actionHistory],
        interactive_elements: elements,
      };
      const { decision, latency_ms: latencyMs } = await askVisionAgent(screenshot, contextForModel);

      for (const [kind, values] of [
        ['visual', decision.visual_findings],
        ['functional', decision.functional_findings],
      ]) {
        for (const value of Array.isArray(values) ? values : []) {
          const finding = normalizeFinding(value, kind, stepNumber, screenshot, page.url());
          if (!finding) continue;
          const key = findingKey(finding);
          const current = findingMap.get(key);
          if (!current) {
            findingMap.set(key, { ...finding, occurrences: 1 });
          } else {
            findingMap.set(key, {
              ...(finding.confidence > current.confidence ? finding : current),
              occurrences: current.occurrences + 1,
            });
          }
        }
      }

      const nextAction = chooseCoverageOverride(
        decision.next_action, elements, actionHistory, scrollStreak,
      );
      const actionResult = await executeAction(
        page, nextAction, elements, actionHistory, allowedOrigins,
      );
      scrollStreak = actionResult.action?.startsWith('scroll:') ? scrollStreak + 1 : 0;
      lastActionResult = actionResult;
      report.steps.push({
        step: stepNumber,
        url: contextForModel.url,
        title: contextForModel.title,
        screenshot,
        summary: clip(decision.summary, 500),
        decision: { ...decision, next_action_executed: nextAction },
        action_result: actionResult,
        model_latency_ms: latencyMs,
      });
      if (actionResult.finished) break;
    }
  } finally {
    await context.close();
    await browser.close();
    try {
      report.video = await video.path();
    } catch {
      report.video = '';
    }
  }

  if (initialStatus >= 400 || initialStatus === 0) {
    report.deterministic_findings.push({
      kind: 'http', severity: 'high', title: `Initial page returned HTTP ${initialStatus || 'unknown'}`,
      evidence: baseUrl,
    });
  }
  for (const error of [...new Set(pageErrors)]) {
    report.deterministic_findings.push({
      kind: 'pageerror', severity: 'high', title: 'Uncaught page error', evidence: error,
    });
  }
  for (const response of failedResponses) {
    report.deterministic_findings.push({
      kind: 'http', severity: 'high', title: `Server response ${response.status}`,
      evidence: response.url,
    });
  }

  report.candidate_findings = [...findingMap.values()];
  report.confirmed_findings = report.candidate_findings.filter((finding) => {
    if (isKnownNonDefect(finding) || finding.confidence < 0.9) return false;
    if (finding.kind === 'functional') return finding.severity === 'high';
    return ['medium', 'high'].includes(finding.severity) && (
      finding.occurrences >= 2 || isConcreteVisualDefect(finding)
    );
  });
  report.status = report.deterministic_findings.length || report.confirmed_findings.length
    ? 'failed'
    : 'passed';
  report.pages_observed = [...new Set(report.steps.map((step) => step.url))];
  writeReport();

  console.log(JSON.stringify({
    status: report.status,
    model,
    steps: report.steps.length,
    pages: report.pages_observed.length,
    deterministic_findings: report.deterministic_findings.length,
    confirmed_findings: report.confirmed_findings.length,
    usage: report.model_usage,
  }, null, 2));
  if (report.status !== 'passed') process.exitCode = 1;
}

main().catch((error) => {
  report.status = 'failed';
  report.operational_error = error instanceof Error ? error.stack || error.message : String(error);
  writeReport();
  console.error(report.operational_error);
  process.exitCode = 1;
});
