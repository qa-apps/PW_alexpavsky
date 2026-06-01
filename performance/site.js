import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const baseUrl = (__ENV.K6_BASE_URL || 'https://www.alexpavsky.com').replace(/\/$/, '');
const scenarioName = __ENV.PERFORMANCE_SCENARIO || 'smoke';
const chatPrompt = __ENV.K6_CHAT_PROMPT || 'Reply with only: OK';

const chatbotOk = new Rate('chatbot_ok');

const publicRoutes = [
  { name: 'home', path: '/', type: 'html', weight: 5 },
  { name: 'health', path: '/api/health', type: 'json', weight: 2 },
  { name: 'feed', path: '/api/feed', type: 'json', weight: 3 },
  { name: 'robots', path: '/robots.txt', type: 'text', weight: 1 },
];

const weightedPublicRoutes = publicRoutes.flatMap((route) =>
  Array.from({ length: route.weight }, () => route),
);

const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '15s',
    tags: { suite: 'k6', profile: 'smoke', surface: 'public' },
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '30s', target: 50 },
      { duration: '30s', target: 100 },
      { duration: '30s', target: 150 },
      { duration: '1m', target: 150 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
    tags: { suite: 'k6', profile: 'load', surface: 'public' },
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '30s', target: 75 },
      { duration: '30s', target: 150 },
      { duration: '30s', target: 250 },
      { duration: '1m', target: 250 },
      { duration: '30s', target: 350 },
      { duration: '1m', target: 350 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
    tags: { suite: 'k6', profile: 'stress', surface: 'public' },
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '5s', target: 300 },
      { duration: '30s', target: 300 },
      { duration: '20s', target: 0 },
    ],
    gracefulRampDown: '20s',
    tags: { suite: 'k6', profile: 'spike', surface: 'public' },
  },
  'spike-slow': {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '15s', target: 50 },
      { duration: '15s', target: 100 },
      { duration: '15s', target: 150 },
      { duration: '15s', target: 200 },
      { duration: '15s', target: 250 },
      { duration: '15s', target: 300 },
      { duration: '15s', target: 350 },
      { duration: '30s', target: 350 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
    tags: { suite: 'k6', profile: 'spike-slow', surface: 'public' },
  },
  'spike-instant': {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '1s', target: 350 },
      { duration: '30s', target: 350 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
    tags: { suite: 'k6', profile: 'spike-instant', surface: 'public' },
  },
  'rps-100': {
    executor: 'constant-arrival-rate',
    rate: 100,
    timeUnit: '1s',
    duration: '15s',
    preAllocatedVUs: 250,
    maxVUs: 500,
    tags: { suite: 'k6', profile: 'rps-100', surface: 'public' },
  },
  'chatbot-minimal': {
    executor: 'shared-iterations',
    vus: 1,
    iterations: 1,
    maxDuration: '45s',
    tags: { suite: 'k6', profile: 'chatbot-minimal', surface: 'chatbot' },
    exec: 'chatbot',
  },
};

const thresholdProfiles = {
  smoke: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['avg<1000', 'p(95)<1500'],
    checks: ['rate>0.99'],
  },
  load: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['avg<1500', 'p(95)<2500'],
    checks: ['rate>0.99'],
  },
  stress: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['avg<2500', 'p(95)<5000'],
    checks: ['rate>0.95'],
  },
  spike: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['avg<3000', 'p(95)<6000'],
    checks: ['rate>0.95'],
  },
  'spike-slow': {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['avg<2500', 'p(95)<5000'],
    checks: ['rate>0.95'],
  },
  'spike-instant': {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['avg<3000', 'p(95)<6000'],
    checks: ['rate>0.95'],
  },
  'rps-100': {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['avg<1500', 'p(95)<2500'],
    checks: ['rate>0.99'],
    dropped_iterations: ['count<1'],
  },
  'chatbot-minimal': {
    http_req_failed: ['rate<0.20'],
    http_req_duration: ['p(95)<30000'],
    checks: ['rate>0.80'],
    chatbot_ok: ['rate>0.80'],
  },
};

if (!scenarios[scenarioName]) {
  throw new Error(`Unsupported PERFORMANCE_SCENARIO: ${scenarioName}`);
}

export const options = {
  scenarios: {
    [scenarioName]: scenarios[scenarioName],
  },
  thresholds: thresholdProfiles[scenarioName],
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

function pickPublicRoute() {
  return weightedPublicRoutes[Math.floor(Math.random() * weightedPublicRoutes.length)];
}

function expectContentType(route, response) {
  const contentType = response.headers['Content-Type'] || '';
  if (route.type === 'html') return contentType.includes('text/html');
  if (route.type === 'json') return contentType.includes('application/json');
  return contentType.includes('text/plain') || contentType.includes('text/html');
}

function validatePublicBody(route, response) {
  if (!response.body || response.body.length === 0) return false;

  if (route.name === 'health') {
    const body = response.json();
    return body?.status === 'ok' && typeof body?.providers === 'object';
  }

  if (route.name === 'feed') {
    const body = response.json();
    const articles = Array.isArray(body) ? body : body?.articles || body?.items || body?.feed;
    return Array.isArray(articles) && articles.length > 0;
  }

  return true;
}

export default function () {
  const route = pickPublicRoute();

  group(route.name, () => {
    const response = http.get(`${baseUrl}${route.path}`, {
      tags: {
        endpoint: route.name,
        route: route.path,
      },
    });

    check(response, {
      [`${route.name}: status is 200`]: (res) => res.status === 200,
      [`${route.name}: content type matches`]: (res) => expectContentType(route, res),
      [`${route.name}: body contract matches`]: (res) => validatePublicBody(route, res),
    });
  });

  sleep(1);
}

export function chatbot() {
  const response = http.post(
    `${baseUrl}/api/chat`,
    JSON.stringify({
      message: chatPrompt,
      session_id: `k6-chatbot-${__VU}-${__ITER}-${Date.now()}`,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '35s',
      tags: {
        endpoint: 'chatbot',
        route: '/api/chat',
      },
    },
  );

  const ok = check(response, {
    'chatbot: no server crash': (res) => res.status < 500,
    'chatbot: body is not empty': (res) => Boolean(res.body && res.body.length > 0),
    'chatbot: expected content type': (res) => {
      const contentType = res.headers['Content-Type'] || '';
      return contentType.includes('application/json') || contentType.includes('text/plain');
    },
  });

  chatbotOk.add(ok);
  sleep(1);
}
