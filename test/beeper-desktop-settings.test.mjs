import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readRepositoryFile = (relativePath) =>
  readFileSync(resolve(repositoryRoot, relativePath), "utf8");
const normalizeWhitespace = (content) => content.replace(/\s+/g, " ");

const guideImages = [
  "beeper-desktop-setup/01-integrations.png",
  "beeper-desktop-setup/02-approved-connections.png",
  "beeper-desktop-setup/03-create-access-token.png",
];

const currentSetupRoute = "Settings → Integrations";
const supportNote =
  "Please do not ask the Beeper Developer Community for help using Even Messages";
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

  for (const content of [onboarding, disclaimer, readme, tailscaleGuide]) {
    assert.match(content, new RegExp(currentSetupRoute));
    for (const legacyPhrase of legacyPhrases) {
      assert.doesNotMatch(content, new RegExp(legacyPhrase));
    }
  }

  for (const content of [onboarding, readme, tailscaleGuide]) {
    assert.match(normalizeWhitespace(content), new RegExp(supportNote));
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
    onboarding,
    /Before creating the token, turn on Allow sensitive actions to send replies\./,
  );
  assert.match(
    readme,
    /callout to enable Allow sensitive actions before creating a token/,
  );

  for (const image of guideImages) {
    const publicPath = resolve(repositoryRoot, "public", image);
    assert.ok(existsSync(publicPath), `missing guide image: ${image}`);
    assert.ok(statSync(publicPath).size > 0, `empty guide image: ${image}`);
    assert.match(onboarding, new RegExp(`/${image}`));
    assert.match(readme, new RegExp(`public/${image}`));
  }

  assert.doesNotMatch(onboarding, /beeper-token-guide\.gif/);
  assert.ok(
    !existsSync(resolve(repositoryRoot, "public/beeper-token-guide.gif")),
    "the obsolete token guide GIF should be removed",
  );
});
