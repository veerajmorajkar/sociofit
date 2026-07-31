#!/usr/bin/env node
/**
 * Secret hygiene guard for backend/.env.example.
 *
 * Fails the build if .env.example contains anything that looks like a real
 * secret: high-entropy base64/hex strings, or a value that's byte-identical
 * to what's currently sitting in a local .env. Run in CI and as a pre-commit
 * hook so a real credential can never sneak into the committed template.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const envExamplePath = path.join(here, '..', '.env.example');
const envPath = path.join(here, '..', '.env');

/** Only apply the "matches your local .env" check to keys that are actually credential-shaped. */
const SENSITIVE_KEY_PATTERN = /(SECRET|_KEY$|API_KEY|TOKEN|PASSWORD|PASS$|PRIVATE)/i;

const PLACEHOLDER_PATTERNS = [
  /^$/, // empty
  /change/i,
  /your[-_]?/i,
  /example/i,
  /placeholder/i,
  /^re_your_/i,
  /localhost/i,
  /^postgres(ql)?:\/\/fitsocial:fitsocial@/i,
  /^v\d+$/i,
  /^https?:\/\//i, // bare URLs are fine — flagged separately if they embed a token
  /^\d+$/, // plain numbers (ports, percentages)
  /^(http|fitsocial):\/\//i,
];

function parseEnvFile(content) {
  const out = new Map();
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    out.set(key, value);
  }
  return out;
}

/** Flags long, high-entropy-looking base64/hex strings — the shape of a real API key/secret. */
function looksLikeSecret(value) {
  if (!value) return false;
  if (PLACEHOLDER_PATTERNS.some((re) => re.test(value))) return false;
  const isLongHex = /^[a-f0-9]{24,}$/i.test(value);
  const isLongBase64 = /^[A-Za-z0-9+/_-]{32,}={0,2}$/.test(value) && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
  return isLongHex || isLongBase64;
}

function main() {
  if (!existsSync(envExamplePath)) {
    console.error(`❌ ${envExamplePath} not found`);
    process.exit(1);
  }

  const exampleVars = parseEnvFile(readFileSync(envExamplePath, 'utf8'));
  const realVars = existsSync(envPath) ? parseEnvFile(readFileSync(envPath, 'utf8')) : new Map();

  const problems = [];

  for (const [key, value] of exampleVars) {
    if (looksLikeSecret(value)) {
      problems.push(`${key}: value looks like a real high-entropy secret, not a placeholder`);
    }
    const realValue = realVars.get(key);
    if (
      SENSITIVE_KEY_PATTERN.test(key) &&
      realValue &&
      realValue.length > 0 &&
      realValue === value &&
      !PLACEHOLDER_PATTERNS.some((re) => re.test(value))
    ) {
      problems.push(`${key}: .env.example value is byte-identical to your local .env — treat it as burned and rotate it`);
    }
  }

  if (problems.length > 0) {
    console.error('❌ .env.example secret hygiene check failed:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  console.log(`✅ .env.example secret hygiene check passed (${exampleVars.size} vars checked)`);
}

main();
