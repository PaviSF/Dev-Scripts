const { execSync } = require("child_process");
const readline = require("readline");

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(
    "Usage: node scripts/eas-multi-update.js <channel> <version1> <version2> ... [-m \"message\"]"
  );
  process.exit(1);
}

const channel = args[0];

let messageIndex = args.indexOf("-m");
let customMessage = null;

if (messageIndex !== -1) {
  customMessage = args[messageIndex + 1];
}

const versions =
  messageIndex !== -1 ? args.slice(1, messageIndex) : args.slice(1);

const platforms = ["android", "ios"];

// get last commit message
const commitMessage = execSync("git log -1 --pretty=%B").toString().trim();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
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

  console.log(`\n🚀 Channel: ${channel}`);
  console.log(`📦 Versions: ${versions.join(", ")}`);
  console.log(`📝 Message: ${finalMessage}\n`);

  for (const version of versions) {
    console.log(`\n📦 Version ${version}`);

    for (const platform of platforms) {
      try {
        console.log(`🚀 Updating ${platform}`);

        execSync(
          `APP_VERSION=${version} eas update --channel ${channel} -p ${platform} -m "${finalMessage}"`,
          { stdio: "inherit" }
        );

        console.log(`✅ ${platform} done`);
      } catch (error) {
        console.error(`❌ Failed for ${platform} on version ${version}`);
        process.exit(1);
      }
    }
  }

  rl.close();
  console.log("\n🎉 All updates completed\n");
}

run();