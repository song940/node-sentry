const URI = require('url');
const qs = require('querystring');
const pkg = require('./package');
const EventEmitter = require('events');

const request = (method, url, payload, headers) => {
  const { protocol } = URI.parse(url);
  const client = require(protocol.slice(0, -1));
  return new Promise((resolve, reject) => {
    const req = client.request(url, {
      method,
      headers,
    }, resolve);
    req.once('error', reject);
    req.end(payload);
  });
};

const post = (url, payload, headers) =>
  request('post', url, JSON.stringify(payload), headers);

const readStream = stream => {
  const buffer = [];
  return new Promise((resolve, reject) => {
    stream
      .on('error', reject)
      .on('data', chunk => buffer.push(chunk))
      .on('end', () => resolve(Buffer.concat(buffer)))
  });
};

/**
 * Sentry Client for Node.js
 * https://docs.sentry.io/clientdev
 */
class Sentry extends EventEmitter {
  constructor(options) {
    super();
    if(typeof options === 'string')
      options = Sentry.parseDSN(options);
    Object.assign(this, options);
  }
  /**
   * parseDSN
   * @param {*} dsn 
   */
  static parseDSN(dsn) {
    const {
      protocol,
      pathname,
      origin: endpoint,
      username: publicKey,
      password: secretKey,
    } = new URI.URL(dsn);
    const projectId = pathname.slice(1);
    return {
      protocol,
      endpoint,
      projectId,
      publicKey,
      secretKey,
    };
  }
  get name() {
    return [pkg.name, pkg.version].join('/');
  }
  get auth() {
    const {
      publicKey: sentry_key,
      secretKey: sentry_secret
    } = this;
    return ['Sentry', qs.stringify({
      sentry_version: 7,
      sentry_client: this.name,
      sentry_timestamp: +new Date,
      sentry_key,
      sentry_secret
    }, ',', null, {
      encodeURIComponent: x => x
    })].join(' ');
  }
  /**
   * sendMessage
   * @docs https://docs.sentry.io/clientdev/attributes/
   * @param {*} body 
   * @param {*} callback 
   */
  send(body, callback = () => {}) {
    const { name, auth, endpoint, projectId } = this;
    const headers = {
      'User-Agent': name,
      'X-Sentry-Auth': auth
    };
    return Promise
      .resolve()
      .then(() => post(`${endpoint}/api/${projectId}/store/`, body, headers))
      .then(readStream)
      .then(JSON.parse)
      .then(res => {
        callback(null, res);
        return res;
      }, callback);
  }
  /**
   * captureMessage
   * @docs https://docs.sentry.io/clientdev/interfaces/message/
   * @param {*} message 
   * @param {*} options 
   * @param {*} callback
   */
  captureMessage(message, options = {}, callback) {
    options.message = message;
    return this.send(options, callback);
  }
  /**
   * captureException
   * @docs https://docs.sentry.io/clientdev/interfaces/exception/
   * @param {*} exception 
   * @param {*} options 
   * @param {*} callback 
   */
  captureException(exception, options = {}, callback) {
    if (typeof exception === 'string')
      exception = new Error(exception);
    if (exception instanceof Error) {
      options.message = exception.toString();
      options.exception = [{
        type: exception.name,
        value: exception.message
      }];
    }
    return this.send(options, callback);
  }
}

module.exports = Sentry;