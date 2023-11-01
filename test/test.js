const test = require('ava');
const request = require('supertest');
const ProxyServer = require('..');

test('starts and stops server', async (t) => {
  const proxy = new ProxyServer();
  await proxy.listen();
  await proxy.close();
  t.pass();
});

test('redirects http to https', async (t) => {
  const proxy = new ProxyServer();
  await proxy.listen();
  const response = await request(proxy.server).get('/foobar');
  const { port } = proxy.server.address();
  t.is(response.status, 301);
  t.is(response.headers.location, `https://127.0.0.1:${port}/foobar`);
});

test('does not redirect http to https', async (t) => {
  const proxy = new ProxyServer({ redirect: false });
  await proxy.listen();
  const response = await request(proxy.server).get('/foobar');
  t.is(response.status, 200);
});

test('serves acme challenge', async (t) => {
  const config = {
    certbot: {
      name: 'name',
      contents: 'contents'
    }
  };
  const proxy = new ProxyServer(config);
  const response = await request(proxy.server).get(
    `/.well-known/acme-challenge/${config.certbot.name}`
  );
  t.is(response.status, 200);
  t.is(response.headers['content-type'], 'text/plain; charset=utf-8');
  t.is(response.text, config.certbot.contents);
});

test('redirects http to https and does not remove prefix', async (t) => {
  const proxy = new ProxyServer({ removeWwwPrefix: false });
  await proxy.listen();
  const response = await request(proxy.server).get('/foobar');
  const { port } = proxy.server.address();
  t.is(response.status, 301);
  t.is(response.headers.location, `https://127.0.0.1:${port}/foobar`);
});

test('starts and stops server with proxyProtocol = true', async (t) => {
  const proxy = new ProxyServer({ proxyProtocol: true });
  await proxy.listen();
  await proxy.close();
  t.pass();
});
