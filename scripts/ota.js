#!/usr/bin/env node
const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const os = require("os");
const path = require("path");

let hasTmux = true;
try {
  execSync("tmux -V", { stdio: "ignore" });
} catch {
  hasTmux = false;
}

const args = process.argv.slice(2);

function parseArgs(args) {
  const result = { channels: [], versions: [], message: null };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "-c" || arg === "--channel") {
      i++;
      while (i < args.length && !args[i].startsWith("-")) {
        result.channels.push(args[i++]);
      }
    } else if (arg === "-v" || arg === "--version") {
      i++;
      while (i < args.length && !args[i].startsWith("-")) {
        result.versions.push(args[i++]);
      }
    } else if (arg === "-m" || arg === "--message") {
      result.message = args[++i];
      i++;
    } else {
      i++;
    }
  }
  return result;
}

const { channels, versions, message: customMessage } = parseArgs(args);

if (channels.length === 0 || versions.length === 0) {
  console.log(
    "Usage: ota -c <channel...> -v <version...> [-m \"message\"]"
  );
  console.log("Example: ota -c staging -v 1.0.0 1.0.1");
  console.log("Example: ota -c staging production -v 1.0.0 -m \"fix crash\"");
  process.exit(1);
}

const platforms = ["android", "ios"];

const commitMessage = execSync("git log -1 --pretty=%B").toString().trim();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function sessionName(channel, version, platform) {
  return `ota_${channel}_${version}_${platform}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

// Fallback used when tmux isn't available: same one-at-a-time behavior as before.
function updatePlatformSync(channel, version, platform, message) {
  console.log(`  🚀 Updating ${platform}`);

  try {
    execSync(
      `APP_VERSION=${version} eas update --channel ${channel} -p ${platform} -m "${message}"`,
      { stdio: "inherit" }
    );
    console.log(`  ✅ ${platform} done`);
  } catch (error) {
    console.error(`  ❌ Failed for ${platform} on version ${version} in channel ${channel}`);
    process.exit(1);
  }
}

// Runs a platform update in its own tmux session so android/ios truly run at
// the same time, each with its own pty, instead of sharing one buffered exec.
async function updatePlatformTmux(channel, version, platform, message, runDir) {
  const label = `[${channel}/${version}/${platform}]`;
  const name = sessionName(channel, version, platform);
  const statusFile = path.join(runDir, `${name}.status`);
  const logFile = path.join(runDir, `${name}.log`);
  const scriptFile = path.join(runDir, `${name}.sh`);

  const script = `#!/bin/bash
APP_VERSION=${version} eas update --channel ${channel} -p ${platform} -m ${JSON.stringify(message)} > ${JSON.stringify(logFile)} 2>&1
echo $? > ${JSON.stringify(statusFile)}
`;
  fs.writeFileSync(scriptFile, script, { mode: 0o755 });

  console.log(`  🚀 ${label} starting (tmux session: ${name})`);
  execSync(`tmux new-session -d -s ${name} bash ${JSON.stringify(scriptFile)}`);

  while (!fs.existsSync(statusFile)) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const exitCode = parseInt(fs.readFileSync(statusFile, "utf8").trim(), 10);
  const output = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8").trim() : "";

  try {
    execSync(`tmux kill-session -t ${name}`, { stdio: "ignore" });
  } catch {}

  const ok = exitCode === 0;
  if (output) {
    (ok ? console.log : console.error)(`${label}\n${output}`);
  }
  console.log(ok ? `  ✅ ${label} done` : `  ❌ ${label} failed`);

  return { channel, version, platform, ok };
}

async function run() {
  let finalMessage = customMessage;

  if (!finalMessage) {
    console.log(`\n📝 Last commit message: "${commitMessage}"`);
    const change = await ask("Do you want to change the update message? (y/N): ");
    if (change.toLowerCase() === "y") {
      finalMessage = await ask("Enter new update message: ");
    } else {
      finalMessage = commitMessage;
    }
  }

  console.log(`\n🚀 Channels: ${channels.join(", ")}`);
  console.log(`📦 Versions: ${versions.join(", ")}`);
  console.log(`📝 Message: ${finalMessage}\n`);

  if (!hasTmux) {
    console.log("ℹ️  tmux not found — running platform updates one at a time.\n");
  }

  const results = [];
  const runDir = hasTmux ? fs.mkdtempSync(path.join(os.tmpdir(), "ota-")) : null;

  for (const channel of channels) {
    console.log(`\n📡 Channel: ${channel}`);

    for (const version of versions) {
      console.log(`\n  📦 Version ${version}`);

      if (hasTmux) {
        const platformResults = await Promise.all(
          platforms.map((platform) =>
            updatePlatformTmux(channel, version, platform, finalMessage, runDir)
          )
        );
        results.push(...platformResults);
      } else {
        for (const platform of platforms) {
          updatePlatformSync(channel, version, platform, finalMessage);
        }
      }
    }
  }

  if (runDir) fs.rmSync(runDir, { recursive: true, force: true });

  rl.close();

  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    console.log(`\n❌ ${failures.length} update(s) failed:`);
    for (const f of failures) {
      console.log(`   - ${f.channel} / ${f.version} / ${f.platform}`);
    }
    process.exit(1);
  }

  console.log("\n🎉 All updates completed\n");
}

run();
