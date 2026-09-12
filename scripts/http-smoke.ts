/**
 * Exercises the built Next.js server over HTTP using an isolated temporary
 * data directory. Runs without Gemini or GitHub credentials and makes no
 * outbound GitHub requests: every autopsy call here fails validation or the
 * origin check before the server talks to GitHub.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomInt } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";

async function main() {
  const directory = await mkdtemp(path.join(tmpdir(), "deadfolio-http-"));
  const port = randomInt(35000, 45000);
  const origin = `http://localhost:${port}`;
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    {
      env: {
        ...process.env,
        PROJECT_REPOSITORY: "local",
        LOCAL_DATA_DIR: directory,
        SEED_DEMOS: "true",
        GEMINI_API_KEY: "",
        GITHUB_TOKEN: "",
        VERCEL: "",
        NEXT_PUBLIC_APP_URL: origin,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let serverLogs = "";
  server.stdout.on("data", (c) => {
    serverLogs += c.toString();
  });
  server.stderr.on("data", (c) => {
    serverLogs += c.toString();
  });
  const autopsy = (body: unknown, requestOrigin = origin, raw = false) =>
    fetch(`${origin}/api/autopsy`, {
      method: "POST",
      headers: { Origin: requestOrigin, "Content-Type": "application/json" },
      body: raw ? (body as string) : JSON.stringify(body),
    });
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (server.exitCode !== null) throw new Error(`Server exited: ${serverLogs}`);
      try {
        if ((await fetch(origin)).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.ok(ready, "Server started");

    for (const route of [
      "/",
      "/graveyard",
      "/about",
      "/autopsy",
      "/autopsy?mode=repo",
      "/pt",
      "/pt/graveyard",
      "/pt/about",
      "/pt/autopsy",
      "/pt/autopsy?mode=repo",
      "/sitemap.xml",
      "/robots.txt",
      "/opengraph-image",
    ]) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      if (route.includes("opengraph-image"))
        assert.match(response.headers.get("content-type") || "", /image\/png/);
    }
    console.log("PASS: public pages, sitemap, robots and OG image render.");

    const home = await (await fetch(origin)).text();
    assert.match(home, /Your GitHub is full of projects you left behind\./);
    assert.match(home, /Scan my GitHub/);
    assert.match(home, /Paste a repository/);
    for (const gone of ["Bury a Project", "Submit my story", "/bury", "/admin"])
      assert.ok(!home.includes(gone), `home should not mention ${gone}`);
    const autopsyPage = await (await fetch(origin + "/autopsy")).text();
    assert.match(autopsyPage, /Find my forgotten projects/);
    assert.match(autopsyPage, /Run Repository Autopsy/);
    for (const [route, copy] of [
      ["/pt", "Seu GitHub está cheio de projetos que ficaram pelo caminho."],
      ["/pt/autopsy", "Encontrar projetos esquecidos"],
      ["/pt/about", "POR QUE ESTAMOS AQUI"],
    ]) {
      const html = await (await fetch(origin + route)).text();
      assert.match(html, /<html[^>]*lang="pt-BR"/);
      assert.ok(html.includes(copy), route);
      assert.ok(html.includes(`href="${route}"`), "Localized canonical");
    }
    console.log("PASS: new value proposition and both entry modes render in both locales.");

    // Retired routes are gone, not hidden.
    for (const route of ["/bury", "/pt/bury", "/admin", "/admin/new", "/api/ai/project-draft"]) {
      const response = await fetch(origin + route, { redirect: "manual" });
      assert.ok([404, 405].includes(response.status), `${route} → ${response.status}`);
    }
    // Demo seeds are never exposed in production.
    assert.equal((await fetch(origin + "/projects/tabula")).status, 404);
    console.log("PASS: /bury, /admin and the story assistant no longer exist; demos stay private in production.");

    // The autopsy API rejects bad origins and malformed input before touching GitHub or Gemini.
    assert.equal((await autopsy({ owner: "a", repo: "b" }, "https://attacker.example")).status, 403);
    assert.equal((await autopsy("{not json", origin, true)).status, 400);
    assert.equal((await autopsy({ owner: "", repo: "b" })).status, 400);
    assert.equal((await autopsy({ owner: "a", repo: "b", locale: "fr" })).status, 400);
    const invalidName = await autopsy({ owner: "a", repo: "not a repo name" });
    assert.equal(invalidName.status, 404);
    assert.deepEqual(await invalidName.json(), { error: "not-found" });
    assert.equal((await fetch(origin + "/api/autopsy")).status, 405);
    console.log("PASS: autopsy API enforces same-origin, validation and safe error codes without provider details.");
  } finally {
    server.kill("SIGTERM");
    await Promise.race([once(server, "exit"), new Promise((r) => setTimeout(r, 5000))]);
    if (server.exitCode === null) server.kill("SIGKILL");
    await rm(directory, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
