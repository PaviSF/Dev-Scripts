#!/usr/bin/env node

const { execSync } = require("child_process");

const commands = process.argv.slice(2);

if (commands.length === 0) {
  console.error("Usage: multiple-run <cmd1> <cmd2> ...");
  process.exit(1);
}

for (const cmd of commands) {
  console.log(`\n> ${cmd}\n`);
  try {
    execSync(cmd, { stdio: "inherit", shell: true });
  } catch (err) {
    console.error(`\nFailed: ${cmd}`);
    process.exit(err.status ?? 1);
  }
}
