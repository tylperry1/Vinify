import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
// Password is read interactively with terminal echo suppressed; never use command-line arguments.
const quiet = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
const input = createInterface({ input: process.stdin, output: quiet, terminal: true });
process.stdout.write('Staff email: ');
const email = (await input.question('')).trim().toLowerCase();
process.stdout.write('Role (ADMIN or SUPER_ADMIN): ');
const role = (await input.question('')).trim();
process.stdout.write('Password (14–256 characters, hidden): ');
const password = await input.question(''); input.close(); process.stdout.write('\n');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['ADMIN','SUPER_ADMIN'].includes(role) || password.length < 14 || password.length > 256) throw new Error('Invalid staff details');
const salt = randomBytes(16).toString('hex');
const passwordHash = `${salt}:${scryptSync(password,salt,64).toString('hex')}`;
const db = new PrismaClient();
try {
  await db.$transaction(async tx => {
    // Existing accounts are deliberately not overwritten.
    const user = await tx.user.create({ data: { email, role, passwordHash } });
    await tx.auditLog.create({ data: { actorId: user.id, action: 'STAFF_PROVISIONED', target: user.id } });
  });
  console.log('Staff account created.');
} finally { await db.$disconnect(); }
