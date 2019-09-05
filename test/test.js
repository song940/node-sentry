const assert = require('assert');
const Sentry = require('..');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

const client = new Sentry('https://56bd97ad21ab43f7851121550817e121@sentry.io/1552332');

const test = (title, fn) => {
  fn().then(() => {
    console.log('✔', title);
  }, err => {
    console.error('✘', title);
    console.error(err.name, err.message);
  });
};

test('capture message', async () => {
  const a = await client.captureMessage('capture message');
  assert.ok(a.id);
});

test('capture exception message', async () => {
  const b = await client.captureException('error message');
  assert.ok(b.id);
});

test('capture error exception', async () => {
  const err = new Error('error object');
  const c = await client.captureException(err);
  assert.ok(c.id);
});
