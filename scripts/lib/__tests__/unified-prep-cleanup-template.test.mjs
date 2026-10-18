import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

// Execute the actual template against an in-memory DB adapter; no PG or browser.
const template = readFileSync(new URL('../../../artifacts/remcard-login-layout-01/cleanup-disposable-fixture.nav.fixture.tpl', import.meta.url), 'utf8')
  .replace(/^#!.*\n/, '').replace(/^import .*;\n/gm, '').split('\nmain()\n')[0];

async function run({ tagged = null, holder = tagged, codes = 1 } = {}) {
  const mutations = [];
  let report;
  const prisma = {
    user: {
      findUnique: async ({ where }) => 'publicId' in where ? tagged : holder,
      delete: async () => { mutations.push('user'); tagged = null; },
      count: async () => tagged ? 1 : 0,
    },
    consent: { deleteMany: async () => { mutations.push('consents'); return { count: 2 }; }, count: async () => 0 },
    authAccount: { deleteMany: async () => { mutations.push('accounts'); return { count: 1 }; }, count: async () => 0 },
    botLoginCode: {
      deleteMany: async ({ where }) => {
        assert.equal(where.identifier, 'max:881234');
        mutations.push('codes');
        const count = codes; codes = 0; return { count };
      },
      count: async () => codes,
    },
  };
  const context = vm.createContext({
    prisma, assertDisposableDatabaseUrl: () => {},
    process: { argv: ['node', 'fixture', 'target'], env: { LOGIN_LAYOUT_FIXTURE_MAX_ID: '881234' },
      stdout: { write: text => { report = JSON.parse(text); } },
      exit: code => { throw new Error(`exit:${code}`); } },
    console,
  });
  try {
    await vm.runInContext(`${template}\nmain()`, context);
    return { report, mutations };
  } catch (error) { error.mutations = mutations; throw error; }
}

test('actual cleanup template removes orphan OTP rows when tagged user is absent', async () => {
  const { report, mutations } = await run();
  assert.deepEqual(mutations, ['codes']);
  assert.equal(report.deleted.botLoginCodes, 1);
  assert.deepEqual(report.remaining, { users: 0, authAccounts: 0, consents: 0, botLoginCodes: 0 });
});
test('actual cleanup template refuses mismatched tagged maxId before writes', async () => {
  await assert.rejects(run({ tagged: { id: 'u', publicId: 'pub-target', maxId: 99n } }),
    error => /does not match/.test(error.message) && error.mutations.length === 0);
});
test('actual cleanup template protects another fixture holding maxId', async () => {
  await assert.rejects(run({ holder: { publicId: 'pub-control', maxId: 881234n } }),
    error => /another fixture/.test(error.message) && error.mutations.length === 0);
});
test('actual cleanup template deletes only addressed fixture and reports four zeros', async () => {
  const { report } = await run({ tagged: { id: 'u', publicId: 'pub-target', maxId: 881234n } });
  assert.deepEqual(report.deleted, { users: 1, authAccounts: 1, consents: 2, botLoginCodes: 1 });
  assert.deepEqual(report.remaining, { users: 0, authAccounts: 0, consents: 0, botLoginCodes: 0 });
});
