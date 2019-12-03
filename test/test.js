const test = require('ava');
const request = require('supertest');

const ProxyServer = require('..');

test('starts and stops server', async t => {
  const proxy = new ProxyServer();
  await proxy.listen();
  await proxy.close();
  t.pass();
});

test('redirects http to https', async t => {
  const proxy = new ProxyServer();
  await proxy.listen();
  const res = await request(proxy.server).get('/foobar');
  const { port } = proxy.server.address();
  t.is(res.status, 301);
  t.is(res.headers.location, `https://127.0.0.1:${port}/foobar`);
});

test('does not redirect http to https', async t => {
  const proxy = new ProxyServer({ redirect: false });
  await proxy.listen();
  const res = await request(proxy.server).get('/foobar');
  t.is(res.status, 200);
});

test('serves acme challenge', async t => {
  const config = {
    certbot: {
      name: 'name',
      contents: 'contents'
    }
  };
  const proxy = new ProxyServer(config);
  const res = await request(proxy.server).get(
    `/.well-known/acme-challenge/${config.certbot.name}`
  );
  t.is(res.status, 200);
  t.is(res.headers['content-type'], 'text/plain; charset=utf-8');
  t.is(res.text, config.certbot.contents);
});
