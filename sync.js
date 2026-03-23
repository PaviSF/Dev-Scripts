const fs = require("fs");
const path = require("path");

const scriptsDir = path.join(__dirname, "scripts");
const packagePath = path.join(__dirname, "package.json");

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

const files = fs.readdirSync(scriptsDir).filter((f) => {
  const ext = path.extname(f);
  return ext === ".sh" || ext === ".js";
});

const bin = pkg.bin || {};
for (const file of files) {
  const ext = path.extname(file);
  const name = path.basename(file, ext).replace(/_/g, "-");
  bin[name] = `./scripts/${file}`;
}

pkg.bin = bin;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
console.log("✅ bin entries updated:", Object.keys(bin).join(", "));
