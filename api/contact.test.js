import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import handler from './contact.js';

const environmentKeys = ['AIRTABLE_TOKEN', 'AIRTABLE_BASE_ID', 'AIRTABLE_LEADS_TABLE'];
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

const createResponse = () => {
  const response = { headers: {}, statusCode: null, body: null };
  response.setHeader = (name, value) => { response.headers[name] = value; };
  response.status = (code) => { response.statusCode = code; return response; };
  response.json = (body) => { response.body = body; return response; };
  return response;
};

beforeEach(() => {
  process.env.AIRTABLE_TOKEN = 'test-token';
  process.env.AIRTABLE_BASE_ID = 'app-test';
  process.env.AIRTABLE_LEADS_TABLE = 'tbl-test';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  environmentKeys.forEach((key) => {
    if (originalEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnvironment[key];
  });
});

test('creates an Airtable lead and lets Airtable set the default status', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };

  const response = createResponse();
  await handler({ method: 'POST', body: { name: ' Alex ', email: 'alex@example.com', whatsapp: ' 11 1234 ', message: ' Necesito ayuda ' } }, response);

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, { ok: true });
  assert.equal(request.url, 'https://api.airtable.com/v0/app-test/tbl-test');
  assert.equal(request.options.headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(request.options.body), {
    records: [{ fields: { Nombre: 'Alex', Email: 'alex@example.com', Whatsapp: '11 1234', Mensaje: 'Necesito ayuda' } }],
  });
  assert.equal('Status' in JSON.parse(request.options.body).records[0].fields, false);
});

test('rejects invalid form data without calling Airtable', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; };

  const response = createResponse();
  await handler({ method: 'POST', body: { name: 'Alex', email: 'invalid-email', message: '' } }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: 'Invalid contact details' });
  assert.equal(called, false);
});

test('only accepts POST requests', async () => {
  const response = createResponse();
  await handler({ method: 'GET' }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'POST');
  assert.deepEqual(response.body, { error: 'Method not allowed' });
});
