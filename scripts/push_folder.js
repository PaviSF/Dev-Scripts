#!/usr/bin/env node
const { execSync, spawnSync } = require("child_process");
const readline = require("readline");

function checkTool(cmd, installHint) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
  } catch {
    console.error(`❌ "${cmd}" is required but was not found. ${installHint}`);
    process.exit(1);
  }
}

checkTool("rsync", "It ships with macOS/Linux by default.");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function run() {
  const username = await ask("Username: ");
  const host = await ask("Remote host (e.g. example.com or 192.168.1.10): ");
  const localPath = await ask("Local folder path: ");
  const remotePath = await ask("Remote folder path: ");

  const remoteTarget = `${username}@${host}:${remotePath}`;

  console.log("\nAbout to sync:");
  console.log(`  Local:  ${localPath}`);
  console.log(`  Remote: ${remoteTarget}\n`);

  const confirm = await ask("Proceed? (y/N): ");
  rl.close();

  if (confirm.toLowerCase() !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }

  console.log("\n🚀 Syncing (ssh will prompt for the password)...\n");

  const result = spawnSync(
    "rsync",
    ["-avz", "-e", "ssh -o StrictHostKeyChecking=accept-new", localPath, remoteTarget],
    { stdio: "inherit" }
  );

  if (result.status !== 0) {
    console.error("\n❌ Sync failed");
    process.exit(result.status ?? 1);
  }

  console.log("\n✅ Done\n");
}

run();
