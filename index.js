const http = require('http');
const util = require('util');

const Router = require('router');
const _ = require('lodash');
const finalhandler = require('finalhandler');
const parse = require('url-parse');
const proxyWrap = require('findhit-proxywrap');
const { boolean } = require('boolean');

const proxiedHttp = proxyWrap.proxy(http);

class ProxyServer {
  constructor(config) {
    this.config = {
      logger: console,
      port: process.env.PROXY_PORT || null,
      certbot: {
        name: process.env.CERTBOT_WELL_KNOWN_NAME || null,
        contents: process.env.CERTBOT_WELL_KNOWN_CONTENTS || null
      },
      proxyProtocol: boolean(process.env.PROXY_PROTOCOL || false),
      removeWwwPrefix: true,
      // useful option if you don't need https redirect
      // (e.g. it's just a certbot server)
      redirect: true,
      ...config
    };

    const router = new Router();

    // support for lets encrypt verification
    if (
      _.isObject(this.config.certbot) &&
      _.isString(this.config.certbot.name) &&
      _.isString(this.config.certbot.contents)
    )
      router.get(
        `/.well-known/acme-challenge/${this.config.certbot.name}`,
        (request, response) => {
          response.setHeader('Content-Type', 'text/plain; charset=utf-8');
          response.end(this.config.certbot.contents);
        }
      );

    if (this.config.redirect)
      router.use((request, response) => {
        if (this.config.removeWwwPrefix)
          request.headers.host = request.headers.host.replace('www.', '');
        response.writeHead(301, {
          Location: parse(`https://${request.headers.host}${request.url}`).href
        });
        response.end();
      });
    else
      router.use((request, response) => {
        response.end();
      });

    const createServer = this.config.proxyProtocol
      ? proxiedHttp.createServer
      : http.createServer;

    this.server = createServer((request, response) => {
      router(request, response, finalhandler(request, response));
    });

    // bind listen/close to this
    this.listen = this.listen.bind(this);
    this.close = this.close.bind(this);
  }

  async listen(port) {
    await util.promisify(this.server.listen).bind(this.server)(port);
  }

  async close() {
    await util.promisify(this.server.close).bind(this.server);
  }
}

module.exports = ProxyServer;
