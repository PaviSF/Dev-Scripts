# Dev Scripts

Personal dev scripts installable as an npm package via GitHub.

## Install

```bash
npm install --save-dev github:PaviSF/Dev-Scripts
```

## Scripts

### `changed-files`
Lists changed files in the current git repo.

```bash
# Show working directory changes
npx changed-files

# Compare between two commits/branches
npx changed-files <commit1> <commit2>
```

Output includes a line-by-line list, a space-separated quoted list, and a total file count.

---

### `delete-branch`
Interactively delete a local and/or remote git branch. Requires [`fzf`](https://github.com/junegunn/fzf).

```bash
# Pick a branch interactively
npx delete-branch

# Delete a specific branch
npx delete-branch <branch-name>
```

---

### `ota`
Run EAS OTA updates across multiple channels, versions, and platforms (android + ios) in one command.

```bash
npx ota -c <channel...> -v <version...> [-m "message"]
```

**Examples:**
```bash
npx ota -c staging -v 1.0.0
npx ota -c production -v 1.0.0 1.1.0 1.2.0
npx ota -c staging production -v 1.0.0
npx ota -c staging -v 1.0.0 -m "fix: crash on login"
```

If no message is provided, it uses the last git commit message and asks if you want to change it.

> **Requirements**
>
> This script sets `APP_VERSION` as an environment variable before running the EAS update. For this to work, your project must:
>
> 1. Use `app.config.ts` or `app.config.js` instead of `app.json`
> 2. Read the app version from `process.env.APP_VERSION`
>
> Example `app.config.ts`:
> ```ts
> export default {
>   expo: {
>     version: process.env.APP_VERSION || "1.0.0",
>     // ...rest of config
>   },
> };
> ```

---

### `multiple-run`
Run multiple commands sequentially. Stops immediately if any command fails.

```bash
npx multiple-run "<cmd1>" "<cmd2>" "<cmd3>"
```

**Examples:**
```bash
npx multiple-run "npx expo install expo-camera" "npx expo install expo-media-library"
npx multiple-run "npm run lint" "npm run test" "npm run build"
```

---

## Usage in package.json

After installing, add to your project's `scripts`:

```json
"scripts": {
  "changed-files": "changed-files",
  "delete-branch": "delete-branch",
  "ota": "ota -c staging -v 1.0.0"
}
```

Then run with `npm run <script-name>`.

---

## Adding New Scripts

1. Drop a `.sh` or `.js` file into `scripts/`
2. Commit — `package.json` bin entries update automatically via a pre-commit hook
3. Push

## Prerequisites

- [`fzf`](https://github.com/junegunn/fzf) — required for `delete-branch`
- [EAS CLI](https://docs.expo.dev/eas-update/getting-started/) — required for `ota`
