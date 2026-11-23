import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

/**
 * Creates one staff account, or sets a new password on an existing account
 * with --reset-password. It never silently overwrites anything.
 *
 * The password is read interactively with terminal echo suppressed, so it is
 * never passed on the command line, written to a file or logged. The target
 * database is printed (host and database name only) before anything is written.
 */

const resetPassword = process.argv.includes('--reset-password');

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function databaseTarget() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? '');
    return { hostname: url.hostname, label: `${url.hostname}${url.pathname}` };
  } catch {
    return null;
  }
}

const target = databaseTarget();
if (!target) {
  console.error('DATABASE_URL is not set. Set it for the database you mean, then run this again.');
  process.exit(1);
}

console.log(`Target database: ${target.label}`);
if (!LOOPBACK.has(target.hostname)) {
  console.log('Warning: this is not a loopback database. The account will be written to that database.');
}

// Echo email and role, but never the password.
let hideInput = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!hideInput) process.stdout.write(chunk);
    callback();
  },
});
const input = createInterface({ input: process.stdin, output, terminal: true });
process.stdout.write('Staff email: ');
const email = (await input.question('')).trim().toLowerCase();
process.stdout.write('Role (ADMIN or SUPER_ADMIN): ');
const role = (await input.question('')).trim();
process.stdout.write('Password (14–256 characters, hidden): ');
hideInput = true;
const password = await input.question('');
hideInput = false;
input.close();
process.stdout.write('\n');

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Invalid email address');
if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) fail('Role must be ADMIN or SUPER_ADMIN');
if (password.length < 14 || password.length > 256) fail('Password must be 14–256 characters');

const salt = randomBytes(16).toString('hex');
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const db = new PrismaClient();
try {
  await db.$transaction(async tx => {
    const existing = await tx.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (existing && !resetPassword) {
      throw new Error(`An account already exists for ${email}. Rerun with --reset-password to set a new password on it.`);
    }
    if (!existing && resetPassword) {
      throw new Error(`No account exists for ${email}. Run without --reset-password to create one.`);
    }
    const user = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { passwordHash, role }, select: { id: true } })
      : await tx.user.create({ data: { email, role, passwordHash, emailVerified: new Date() }, select: { id: true } });
    await tx.auditLog.create({
      data: { actorId: user.id, action: existing ? 'STAFF_PASSWORD_RESET' : 'STAFF_PROVISIONED', target: user.id },
    });
    if (existing) console.log(`Password replaced for ${email}. Role is now ${role} (was ${existing.role}). Sign in at /login.`);
  });
  if (!resetPassword) console.log(`Staff account created for ${email} (${role}). Sign in at /login.`);
} catch (error) {
  console.error(`✖ ${error.message}`);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
