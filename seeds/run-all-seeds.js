#!/usr/bin/env node
/**
 * run-all-seeds.js  —  Master seed runner
 *
 * Copies each seed file into the correct container then executes it.
 * Runs seeds in dependency order:
 *   01 auth  →  02 doctor  →  03 patient  →  04 appointment
 *   →  05 payment  →  06 notification  →  07 audit
 *   →  08 telemedicine  →  09 ai-symptom
 *
 * Usage (from project root):
 *   node seeds/run-all-seeds.js
 *
 * Prerequisites:
 *   - Docker is running with all healthcare-* containers up
 *   - Node.js available on PATH
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const SEEDS_DIR = path.join(__dirname);

// workdir must match the container's WORKDIR so node_modules is resolvable
const STEPS = [
  { file: '01-auth-service.seed.js',         container: 'healthcare-auth-service',         workdir: '/app' },
  { file: '02-doctor-service.seed.js',        container: 'healthcare-doctor-service',        workdir: '/app' },
  { file: '03-patient-service.seed.js',       container: 'healthcare-patient-service',       workdir: '/app' },
  { file: '04-appointment-service.seed.js',   container: 'healthcare-appointment-service',   workdir: '/usr/src/app' },
  { file: '05-payment-service.seed.js',       container: 'healthcare-payment-service',       workdir: '/app' },
  { file: '06-notification-service.seed.js',  container: 'healthcare-notification-service',  workdir: '/usr/src/app' },
  { file: '07-audit-service.seed.js',         container: 'healthcare-audit-service',         workdir: '/app' },
  { file: '08-telemedicine-service.seed.js',  container: 'healthcare-telemedicine-service',  workdir: '/app' },
  { file: '09-ai-symptom-service.seed.js',    container: 'healthcare-ai-symptom-service',    workdir: '/app' },
];

function run(cmd, label) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[runner] ${label}`);
  console.log(`${'─'.repeat(60)}`);
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    process.stdout.write(output);
  } catch (err) {
    process.stderr.write(err.stdout || '');
    process.stderr.write(err.stderr || '');
    throw new Error(`Command failed: ${label}`);
  }
}

async function main() {
  console.log('\n====  Telemedicine Platform — Seed All Databases  ====\n');

  let passed = 0;
  let failed = 0;

  for (const step of STEPS) {
    const seedPath = path.join(SEEDS_DIR, step.file);
    if (!fs.existsSync(seedPath)) {
      console.warn(`[runner] SKIP — file not found: ${step.file}`);
      continue;
    }

    // Copy seed file into container workdir/seeds/ so node_modules is resolvable
    const containerPath = `${step.workdir}/seeds/${step.file}`;
    try {
      run(
        `docker exec ${step.container} mkdir -p ${step.workdir}/seeds`,
        `Creating seeds dir in ${step.container}`
      );
      run(
        `docker cp "${seedPath}" ${step.container}:${containerPath}`,
        `Copying ${step.file} → ${step.container}`
      );
      run(
        `docker exec -w ${step.workdir} ${step.container} node ${containerPath}`,
        `Running ${step.file} in ${step.container}`
      );
      passed++;
    } catch (err) {
      console.error(`[runner] FAILED: ${step.file} — ${err.message}`);
      failed++;
    }
  }

  console.log('\n====  Seed Summary  ====');
  console.log(`  Passed : ${passed}`);
  console.log(`  Failed : ${failed}`);
  console.log('========================\n');

  if (failed > 0) process.exit(1);
}

main();
