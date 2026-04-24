import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.K6_BASE_URL || 'https://www.alexpavsky.com').replace(/\/$/, '');
const scenarioName = __ENV.PERFORMANCE_SCENARIO || 'performance';

const scenarios = {
  performance: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '30s', target: 25 },
      { duration: '30s', target: 50 },
      { duration: '1m', target: 50 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '30s',
    tags: { suite: 'performance', profile: 'performance' },
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
    tags: { suite: 'performance', profile: 'load' },
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
    tags: { suite: 'performance', profile: 'spike-slow' },
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
    tags: { suite: 'performance', profile: 'spike-instant' },
  },
};

if (!scenarios[scenarioName]) {
  throw new Error(`Unsupported PERFORMANCE_SCENARIO: ${scenarioName}`);
}

export const options = {
  scenarios: {
    [scenarioName]: scenarios[scenarioName],
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['avg<1200', 'p(95)<2000'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

export default function () {
  const response = http.get(`${baseUrl}/`, {
    tags: {
      page: 'home',
    },
  });

  check(response, {
    'status is 200': (res) => res.status === 200,
    'content type is html': (res) => (res.headers['Content-Type'] || '').includes('text/html'),
    'body is not empty': (res) => Boolean(res.body && res.body.length > 0),
  });

  sleep(1);
}
