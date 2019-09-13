const http = require('http');
const util = require('util');

const Router = require('router');
const _ = require('lodash');
const finalhandler = require('finalhandler');
const parse = require('url-parse');

class ProxyServer {
  constructor(config) {
    this.config = {
      logger: console,
      port: process.env.PROXY_PORT || null,
      certbot: {
        name: process.env.CERTBOT_WELL_KNOWN_NAME || null,
        contents: process.env.CERTBOT_WELL_KNOWN_CONTENTS || null
      },
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
        (req, res) => {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(this.config.certbot.contents);
        }
      );

    router.use((req, res) => {
      res.writeHead(301, {
        Location: parse(`https://${req.headers.host}${req.url}`).href
      });
      res.end();
    });

    this.server = http.createServer((req, res) => {
      router(req, res, finalhandler(req, res));
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
