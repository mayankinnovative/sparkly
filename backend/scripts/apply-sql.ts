// Run the SQL migration through the existing Prisma client (pooled URL).
// This avoids `prisma db execute` which prefers DIRECT_URL.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import prisma from '../src/config/database';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: tsx scripts/apply-sql.ts <path-to-sql-file>');
    process.exit(1);
  }

  const sqlPath = path.resolve(file);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Strip BEGIN/COMMIT — Prisma's $executeRawUnsafe wraps each statement in
  // its own transaction, so explicit BEGIN/COMMIT triggers a parse error.
  // Also strip line comments so we can detect empty statements correctly.
  const cleaned = sql
    .replace(/^\s*--.*$/gm, '')
    .replace(/^\s*BEGIN\s*;\s*$/gim, '')
    .replace(/^\s*COMMIT\s*;\s*$/gim, '');

  const statements = cleaned
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Applying ${statements.length} statement(s) from ${sqlPath} ...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]!;
    const preview = stmt.split('\n')[0]!.slice(0, 80);
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview} ...`);
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log(' OK');
    } catch (err: any) {
      console.log(` FAIL: ${err.message}`);
      throw err;
    }
  }

  console.log('Done.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
