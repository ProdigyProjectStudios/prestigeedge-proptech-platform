import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";

// Inventory only: never read or print file contents, credentials, or remote URLs.
// This is not a secret scan or a security certification.
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0").filter(Boolean);
const sensitiveNames = files.filter((file) =>
  /(^|\/)\.env($|\.)/.test(file) && !file.endsWith(".env.example") ||
  /\.(pem|key|p12|pfx)$/i.test(file));
const large = files.flatMap((file) => {
  try {
    const bytes = statSync(file).size;
    return bytes > 10 * 1024 * 1024 ? [{ file, megabytes: +(bytes / 1024 / 1024).toFixed(1) }] : [];
  } catch { return []; }
});
const reviewGroups = {
  uploadedMedia: files.filter((file) => file.startsWith("uploads/")).length,
  attachedAssets: files.filter((file) => file.startsWith("attached_assets/")).length,
  agentMemory: files.filter((file) => file.startsWith(".agents/")).length,
  legacyCommercialDocuments: files.filter((file) =>
    /^(BUYER_HANDOVER|DEPLOYMENT_GUIDE|DUE_DILIGENCE|FLIPPA_|MARKETPLACE_|PLATFORM_VALUE|PORTFOLIO|TECHNICAL_SPECIFICATIONS|test-admin|test-ai-tools)/.test(file)),
};
console.log(JSON.stringify({
  scope: "Tracked-file publication inventory; does not inspect contents or Git history.",
  trackedFiles: files.length,
  sensitiveFilenameReview: sensitiveNames,
  filesOver10MB: large,
  reviewGroups,
  publicationStatus: "HOLD: content, history, media permissions, licensing and export review required",
}, null, 2));
process.exitCode = sensitiveNames.length || large.length ? 1 : 0;
