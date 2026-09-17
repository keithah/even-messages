import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readRepositoryFile = (relativePath) =>
  readFileSync(resolve(repositoryRoot, relativePath), "utf8");
const normalizeWhitespace = (content) => content.replace(/\s+/g, " ");
const stripMarkup = (content) => content.replace(/<[^>]+>/g, "");
const pngMetadataChunks = new Set(["iCCP", "tEXt", "zTXt", "iTXt", "eXIf"]);

const getPngChunkTypes = (path) => {
  const png = readFileSync(path);
  assert.equal(
    png.subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
    `${path} is not a PNG`,
  );

  const chunks = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const end = offset + length + 12;
    assert.ok(end <= png.length, `${path} has a malformed PNG chunk`);
    chunks.push(png.subarray(offset + 4, offset + 8).toString("ascii"));
    offset = end;
  }
  assert.equal(offset, png.length, `${path} has trailing PNG data`);
  return chunks;
};

const guideImages = [
  "beeper-desktop-setup/01-integrations.png",
  "beeper-desktop-setup/02-approved-connections.png",
  "beeper-desktop-setup/03-create-access-token.png",
];

const currentSetupRoute = "Settings → Integrations";
const supportNote =
  "Please do not ask the Beeper Developer Community for help using Even Messages";
const sensitiveActionsScope = "send messages and modify your account";
const legacyPhrases = [
  "Developer Mode",
  "Development Mode",
  "Development Server",
];

test("Beeper setup guidance points to Integrations and uses sanitized screenshots", () => {
  const onboarding = readRepositoryFile("src/components/DevModeUI.tsx");
  const disclaimer = readRepositoryFile("src/components/Disclaimer.tsx");
  const readme = readRepositoryFile("README.md");
  const tailscaleGuide = readRepositoryFile("docs/TAILSCALE_SETUP.md");
  const styles = readRepositoryFile("src/components/DevModeUI.module.css");

  for (const content of [onboarding, disclaimer, readme, tailscaleGuide]) {
    assert.match(content, new RegExp(currentSetupRoute));
    for (const legacyPhrase of legacyPhrases) {
      assert.doesNotMatch(content, new RegExp(legacyPhrase));
    }
  }

  for (const content of [onboarding, readme, tailscaleGuide]) {
    assert.match(normalizeWhitespace(content), new RegExp(supportNote));
    assert.match(normalizeWhitespace(content), new RegExp(sensitiveActionsScope));
  }

  for (const phrase of [
    "Allow connections",
    "Create a new token for Beeper Desktop API",
    "Allow sensitive actions",
  ]) {
    assert.match(onboarding, new RegExp(phrase));
    assert.match(readme, new RegExp(phrase));
  }

  assert.match(
    normalizeWhitespace(stripMarkup(onboarding)),
    /Allow sensitive actions lets the token send messages and modify your account\. Enable it only for replies\./,
  );
  assert.match(
    readme,
    /callout that Allow sensitive actions can send messages and modify your account/,
  );

  const footerRule = styles.match(/\.footer\s*\{([^}]*)\}/)?.[1];
  assert.ok(footerRule, "missing footer rule");
  assert.doesNotMatch(
    footerRule,
    /position\s*:\s*sticky/,
    "the flex footer must not overlap scrollable setup guidance",
  );

  for (const image of guideImages) {
    const publicPath = resolve(repositoryRoot, "public", image);
    assert.ok(existsSync(publicPath), `missing guide image: ${image}`);
    assert.ok(statSync(publicPath).size > 0, `empty guide image: ${image}`);
    const chunks = getPngChunkTypes(publicPath);
    assert.ok(
      chunks.every((chunk) => !pngMetadataChunks.has(chunk)),
      `${image} must not retain PNG metadata chunks: ${chunks.join(", ")}`,
    );
    assert.match(onboarding, new RegExp(`/${image}`));
    assert.match(readme, new RegExp(`public/${image}`));
  }

  assert.doesNotMatch(onboarding, /beeper-token-guide\.gif/);
  assert.ok(
    !existsSync(resolve(repositoryRoot, "public/beeper-token-guide.gif")),
    "the obsolete token guide GIF should be removed",
  );
});
