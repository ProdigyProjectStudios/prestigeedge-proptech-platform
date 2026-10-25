import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Produce a fresh publication snapshot. Never copy local history or configuration.
const root = process.cwd();
const target = mkdtempSync(path.join(tmpdir(), "prestigeedge-public-"));
const files = [
  "README.md", ".env.example", ".gitignore", "package.json", "package-lock.json",
  "components.json", "drizzle.config.ts", "postcss.config.js",
  "tailwind.config.ts", "tsconfig.json", "vite.config.ts",
];
for (const file of files) {
  cpSync(path.join(root, file), path.join(target, file));
}
for (const directory of ["client", "server", "shared", "docs", "scripts"]) {
  cpSync(path.join(root, directory), path.join(target, directory), {
    recursive: true,
    filter(source) {
      const relative = path.relative(root, source).split(path.sep).join("/");
      return relative !== "server/public" && !/(^|\/)(node_modules|\.env(?:\..*)?)($|\/)/.test(relative);
    },
  });
}
mkdirSync(path.join(target, "uploads"), { recursive: true });
for (const file of readdirSync(path.join(root, "uploads"))) {
  if (/\.(?:jpg|jpeg|png|webp|gif|svg)$/i.test(file)) {
    cpSync(path.join(root, "uploads", file), path.join(target, "uploads", file));
  }
}

// The public snapshot must not ship working account autofill credentials.
const loginPath = path.join(target, "client/src/components/auth/login-form.tsx");
const login = readFileSync(loginPath, "utf8");
const sanitizedLogin = login.replace(
  /const demoCredentials = \[[\s\S]*?\n  \];/,
  "const demoCredentials: Array<{ email: string; password: string; role: string }> = [];",
);
if (sanitizedLogin === login) throw new Error("Expected account-autofill declaration was not found; publication stopped.");
writeFileSync(loginPath, sanitizedLogin);

// Reject known credential formats and exact configured secrets without printing values.
const patterns = [
  /github_pat_[A-Za-z0-9_]{20,}/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /sk-ant-[A-Za-z0-9_-]{20,}/,
  /sk_live_[A-Za-z0-9]{12,}/,
  /AKIA[A-Z0-9]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:postgres(?:ql)?|mongodb(?:\+srv)?):\/\/[^\s/]+:[^\s@]+@/i,
];
const secretNames = [
  "GITHUB_TOKEN", "DATABASE_URL", "NEON_DATABASE_URL", "SESSION_SECRET", "JWT_SECRET",
  "AI_INTEGRATIONS_ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY", "STRIPE_SECRET_KEY",
  "SMTP_PASS", "GOOGLE_MAPS_API_KEY",
];
const configuredSecrets = secretNames.map((name) => process.env[name]).filter((value) => value && value.length >= 8);
let checked = 0;
const failures = [];
function scan(directory) {
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name);
    if (statSync(file).isDirectory()) { scan(file); continue; }
    const relative = path.relative(target, file);
    if (/\.(?:jpg|jpeg|png|gif|webp|ico|woff2?|ttf|mp4|pdf)$/i.test(name)) continue;
    const text = readFileSync(file, "utf8");
    checked++;
    if (patterns.some((pattern) => pattern.test(text)) || configuredSecrets.some((value) => text.includes(value))) {
      failures.push(relative);
    }
  }
}
scan(target);
if (failures.length) throw new Error(`Credential review required for: ${failures.join(", ")}`);
if (existsSync(path.join(target, ".git"))) throw new Error("Unexpected Git history in export.");
console.log(JSON.stringify({
  exportDirectory: target,
  textFilesChecked: checked,
  credentialPatternMatches: 0,
  configuredSecretMatches: 0,
  omitted: ["Git history", "chat attachments", "unused archives", "legacy sales/handover documents", "account autofill credentials", "local configuration", "agent memory", "generated build output"],
}, null, 2));
