const Sentry = require('..');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

const client = new Sentry('https://56bd97ad21ab43f7851121550817e121@sentry.io/1552332');

client.captureMessage('test message');

try {
  throw new Error('test error');
} catch (e) {
  client.captureException(e);
}