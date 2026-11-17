// Nagebootste GitHub-API: repo-info en contents (GET/PUT met sha). Gedeelde stand = "GitHub" voor meerdere apparaten.
const crypto = require('crypto');
function createMock(opts = {}) {
  const files = {};            // path -> { content(base64), sha }
  const log = [];
  const repo = { private: opts.public ? false : true, permissions: { push: opts.readonly ? false : true } };
  let failNext = 0;
  const sha = (c) => crypto.createHash('sha1').update(c).digest('hex');
  async function handle(route) {
    const req = route.request(); const u = new URL(req.url()); const method = req.method();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json' };
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const auth = req.headers()['authorization'] || '';
    log.push(method + ' ' + u.pathname);
    if (auth !== 'Bearer ' + (opts.token || 'github_pat_testtoken_0123456789')) return route.fulfill({ status: 401, headers: cors, body: JSON.stringify({ message: 'Bad credentials' }) });
    if (failNext > 0) { failNext--; return route.fulfill({ status: 500, headers: cors, body: JSON.stringify({ message: 'oeps' }) }); }
    const m = u.pathname.match(/^\/repos\/([^/]+\/[^/]+)(?:\/contents\/(.+))?$/);
    if (!m) return route.fulfill({ status: 404, headers: cors, body: '{}' });
    if (!m[2]) return route.fulfill({ status: 200, headers: cors, body: JSON.stringify(repo) });
    const p = decodeURIComponent(m[2]);
    if (method === 'GET') {
      const f = files[p]; if (!f) return route.fulfill({ status: 404, headers: cors, body: JSON.stringify({ message: 'Not Found' }) });
      const withNl = f.content.replace(/(.{60})/g, '$1\n');
      return route.fulfill({ status: 200, headers: cors, body: JSON.stringify({ content: withNl, sha: f.sha, encoding: 'base64' }) });
    }
    if (method === 'PUT') {
      const b = JSON.parse(req.postData()); const f = files[p];
      if (f && b.sha !== f.sha) return route.fulfill({ status: 409, headers: cors, body: JSON.stringify({ message: p + ' does not match ' + f.sha }) });
      if (!f && b.sha) return route.fulfill({ status: 422, headers: cors, body: JSON.stringify({ message: 'invalid sha' }) });
      const content = b.content.replace(/\s/g, ''); files[p] = { content, sha: sha(content + Date.now() + Math.random()) };
      return route.fulfill({ status: f ? 200 : 201, headers: cors, body: JSON.stringify({ content: { sha: files[p].sha } }) });
    }
    return route.fulfill({ status: 405, headers: cors, body: '{}' });
  }
  return {
    handle, files, log, repo,
    read: (p) => files[p] ? JSON.parse(Buffer.from(files[p].content, 'base64').toString('utf8')) : null,
    fail: (n) => { failNext = n; }
  };
}
module.exports = { createMock };
