import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { previewPort, canUseFreePort } from './preview-port.mjs';

// Development preview only. The deployed artifact remains plain static files.
const root = resolve(import.meta.dir, '../site');
const options = {
  hostname: '127.0.0.1',
  async fetch(request: Request) {
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    try {
      const url = new URL(request.url);
      let path = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (path !== root && !path.startsWith(root + sep))
        return new Response('Forbidden', { status: 403 });
      if ((await stat(path)).isDirectory()) {
        if (!url.pathname.endsWith('/'))
          return new Response(null, {
            status: 301,
            headers: { Location: url.pathname + '/' + url.search },
          });
        path = resolve(path, 'index.html');
      }
      return new Response(Bun.file(path), {
        headers: { 'Cache-Control': 'no-store', 'X-Preview-Runtime': `Bun/${Bun.version}` },
      });
    } catch {
      return new Response(Bun.file(resolve(root, '404.html')), {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }
  },
};

try {
  const selected = previewPort(process.env);
  let server;
  try {
    server = Bun.serve({ ...options, port: selected.port });
  } catch (error) {
    if (!canUseFreePort(error, selected.explicit)) {
      if (selected.explicit && error?.code === 'EADDRINUSE') {
        console.error(`PORT=${selected.port} is already in use. Choose another PORT; no listener was stopped.`);
        process.exit(1);
      }
      throw error;
    }
    console.warn(`Default port ${selected.port} is busy. Choosing a free loopback port; existing listeners are unchanged.`);
    server = Bun.serve({ ...options, port: 0 });
  }
  console.log(`\nTHE DATA PUB PREVIEW → ${server.url}\nBun ${Bun.version} · loopback only · Ctrl+C to stop\n`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
