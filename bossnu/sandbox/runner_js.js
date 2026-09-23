/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const CODE_PATH = '/tmp/user_code.js';
const HTTP_LOG = '/tmp/http_log.jsonl';
const origFetch = global.fetch;
if (origFetch) {
  global.fetch = async (...args) => {
    const start = Date.now();
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    const method = (args[1] && args[1].method) || 'GET';
    const entry = { url, method, timestamp: Date.now() / 1000 };
    try {
      const resp = await origFetch(...args);
      const text = await resp.clone().text();
      entry.status = resp.status;
      entry.snippet = text.slice(0, 200);
      entry.duration_ms = Date.now() - start;
      fs.appendFileSync(HTTP_LOG, JSON.stringify(entry) + '\n');
      return resp;
    } catch (e) {
      entry.status = null;
      entry.error = `${e.name}: ${e.message}`;
      entry.duration_ms = Date.now() - start;
      fs.appendFileSync(HTTP_LOG, JSON.stringify(entry) + '\n');
      throw e;
    }
  };
}
async function main() {
  if (!fs.existsSync(CODE_PATH)) {
    console.log('__BOSS_RESULT__' + JSON.stringify({ error: 'no code', exit_code: 1, stdout: '', stderr: '', duration_ms: 0, http_calls: [] }));
    return;
  }
  if (fs.existsSync(HTTP_LOG)) fs.unlinkSync(HTTP_LOG);
  const code = fs.readFileSync(CODE_PATH, 'utf8');
  let stdout = '', stderr = '', tb = null, exitCode = 0;
  const start = Date.now();
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => { stdout += a.join(' ') + '\n'; };
  console.error = (...a) => { stderr += a.join(' ') + '\n'; };
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction(code)();
  } catch (e) {
    exitCode = 1;
    tb = e.stack || String(e);
  }
  const duration_ms = Date.now() - start;
  let httpCalls = [];
  if (fs.existsSync(HTTP_LOG)) {
    httpCalls = fs.readFileSync(HTTP_LOG, 'utf8').trim().split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  }
  console.log = origLog;
  console.error = origErr;
  origLog('__BOSS_RESULT__' + JSON.stringify({ exit_code: exitCode, stdout, stderr, traceback: tb, duration_ms, http_calls: httpCalls }));
}
main();
