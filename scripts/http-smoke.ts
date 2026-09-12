/** Exercises the built Next.js server over HTTP using an isolated temporary repository. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomInt } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { once } from "node:events";
import sharp from "sharp";
import { emptySubmission } from "../src/lib/schemas/empty-submission";
const require = createRequire(import.meta.url);
const { encodeReply } =
  require("next/dist/compiled/react-server-dom-webpack/client.node") as {
    encodeReply: (args: unknown[]) => Promise<string | FormData>;
  };
async function main() {
  const manifest = JSON.parse(
    await readFile(".next/server/server-reference-manifest.json", "utf8"),
  );
  const actionIds = Object.fromEntries(
    Object.entries(
      manifest.node as Record<string, { exportedName: string }>,
    ).map(([id, v]) => [v.exportedName, id]),
  );
  const directory = await mkdtemp(path.join(tmpdir(), "deadfolio-http-"));
  const port = randomInt(35000, 45000);
  const origin = `http://localhost:${port}`;
  const password = randomBytes(32).toString("hex");
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    {
      env: {
        ...process.env,
        PROJECT_REPOSITORY: "local",
        LOCAL_DATA_DIR: directory,
        SEED_DEMOS: "true",
        AI_ENABLED: "false",
        GEMINI_API_KEY: "",
        VERCEL: "",
        ADMIN_PASSWORD: password,
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
  let cookie = "";
  async function action(
    name: string,
    args: unknown[],
    authenticated = false,
    requestOrigin = origin,
  ) {
    const body = await encodeReply(args);
    const response = await fetch(
      `${origin}/${name === "saveSubmission" || name === "saveStory" ? "bury" : "admin"}`,
      {
        method: "POST",
        headers: {
          "Next-Action": actionIds[name],
          Origin: requestOrigin,
          ...(authenticated ? { Cookie: cookie } : {}),
          ...(typeof body === "string"
            ? { "Content-Type": "text/plain;charset=UTF-8" }
            : {}),
        },
        body,
        redirect: "manual",
      },
    );
    const text = await response.text();
    const result = text.split("\n").flatMap((line) => {
      const colon = line.indexOf(":");
      try {
        const value = JSON.parse(line.slice(colon + 1));
        return value && typeof value === "object" && "ok" in value
          ? [value]
          : [];
      } catch {
        return [];
      }
    })[0];
    return { response, result, text };
  }
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (server.exitCode !== null)
        throw new Error(`Server exited: ${serverLogs}`);
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
      "/bury",
      "/pt",
      "/pt/graveyard",
      "/pt/about",
      "/pt/bury",
      "/admin",
      "/sitemap.xml",
      "/robots.txt",
      "/opengraph-image",
    ]) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      if (route.includes("opengraph-image"))
        assert.match(response.headers.get("content-type") || "", /image\/png/);
    }
    console.log("PASS: public pages, sitemap, robots and OG images render.");
    const bury = await (await fetch(origin + "/bury")).text();
    assert.match(bury, /Submit my story/);
    assert.ok(!bury.includes("assistant is offline"));
    assert.ok(!bury.includes("I’d rather fill it out manually"));
    for (const [route, copy] of [
      ["/pt", "Projetos bons também morrem."],
      ["/pt/bury", "Conta pra gente o que aconteceu."],
      ["/pt/about", "POR QUE ESTAMOS AQUI"],
    ]) {
      const html = await (await fetch(origin + route)).text();
      assert.match(html, /<html[^>]*lang="pt-BR"/);
      assert.ok(html.includes(copy), route);
      assert.ok(html.includes(`href="${route}"`), "Localized canonical");
    }
    assert.equal((await fetch(origin + "/projects/tabula")).status, 404);
    console.log(
      "PASS: both locales render; production does not invent or expose demo projects.",
    );
    const raw = {
      title: "Unformatted story",
      story:
        "PRIVATE-RAW-STORY: We built a small tool for organizing drafts and stopped when our workflow changed.",
      url: "https://example.test/project",
      nextStep: "adoption",
      creatorName: "Raw Maker",
      email: "raw-private@example.test",
      locale: "pt",
    };
    const rawSaved = await action("saveStory", [
      { ...raw, moderationStatus: "published", isDemo: true },
    ]);
    assert.equal(rawSaved.result?.ok, true, rawSaved.text);
    const rawId = rawSaved.result.id;
    const rawRecord = JSON.parse(
      await readFile(path.join(directory, "projects", `${rawId}.json`), "utf8"),
    );
    assert.equal(rawRecord.submissionType, "raw");
    assert.equal(rawRecord.rawStory, raw.story);
    assert.equal(rawRecord.locale, "pt");
    assert.equal(rawRecord.moderationStatus, "submitted");
    assert.equal(
      (await fetch(origin + `/pt/projects/${rawRecord.slug}`)).status,
      404,
    );

    const offline = await fetch(origin + "/api/ai/project-draft", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        story:
          "A valid project description that contains enough characters to extract.",
      }),
    });
    assert.equal(offline.status, 503);
    console.log("PASS: optional AI fails gracefully without credentials.");
    const input = {
      ...structuredClone(emptySubmission),
      title: "HTTP smoke project",
      tagline: "A real submission through the running Next.js server.",
      originalIdea:
        "A small project for demonstrating an end-to-end public submission.",
      causeExplanation:
        "The project was abandoned after the maker stopped using it.",
      email: "never-public@example.test",
      creator: { ...emptySubmission.creator, name: "Smoke Test" },
      contactUrl: "https://example.com/contact",
    };
    const invalid = new FormData();
    invalid.set(
      "project",
      JSON.stringify({ ...input, contactUrl: "javascript:alert(1)" }),
    );
    assert.equal((await action("saveSubmission", [invalid])).result?.ok, false);
    const form = new FormData();
    form.set(
      "project",
      JSON.stringify({ ...input, moderationStatus: "published" }),
    );
    const bytes = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#c6f36b" },
    })
      .png()
      .toBuffer();
    form.set(
      "cover",
      new File([new Uint8Array(bytes)], "cover.png", { type: "image/png" }),
    );
    form.set("coverAlt", "Smoke test cover");
    const saved = await action("saveSubmission", [form]);
    assert.equal(saved.result?.ok, true, saved.text);
    const id = saved.result.id;
    const record = JSON.parse(
      await readFile(path.join(directory, "projects", `${id}.json`), "utf8"),
    );
    assert.equal(record.moderationStatus, "submitted");
    assert.equal(
      (await fetch(origin + `/projects/${record.slug}`)).status,
      404,
    );
    assert.equal((await fetch(origin + record.coverImage.url)).status, 404);
    assert.equal(
      (await action("moderateProject", [id, "publish"])).result?.ok,
      false,
    );
    const unauthorizedEdit = new FormData();
    unauthorizedEdit.set("project", JSON.stringify(input));
    assert.equal(
      (await action("saveSubmission", [unauthorizedEdit, id])).result?.ok,
      false,
    );
    const privatePreview = await fetch(origin + `/admin/${id}`, {
      redirect: "manual",
    });
    assert.equal(privatePreview.status, 307);
    console.log(
      "PASS: validated submission and upload remain private; unauthorized moderation/editing are rejected.",
    );
    const login = new FormData();
    login.set("password", password);
    const signed = await action("loginAdmin", [{ error: "" }, login]);
    const setCookie = signed.response.headers.get("set-cookie") || "";
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=strict/i);
    assert.match(setCookie, /Secure/i);
    cookie = setCookie.split(";")[0];
    assert.ok(cookie.startsWith("deadfolio-admin="));
    const dashboard = await (
      await fetch(origin + "/admin", { headers: { Cookie: cookie } })
    ).text();
    assert.match(dashboard, /Not ready to launch/);
    assert.match(
      dashboard.replace(/<!--.*?-->/g, ""),
      /0\/2 founder projects published/,
    );
    assert.equal(
      (await action("moderateProject", [rawId, "publish"], true)).result?.ok,
      false,
    );
    const rawEdit = await (
      await fetch(origin + `/admin/${rawId}/edit`, {
        headers: { Cookie: cookie },
      })
    ).text();
    assert.ok(rawEdit.includes(raw.story));
    const converted = new FormData();
    converted.set(
      "project",
      JSON.stringify({
        ...input,
        title: raw.title,
        email: raw.email,
        creator: { ...input.creator, name: raw.creatorName },
      }),
    );
    assert.equal(
      (await action("saveSubmission", [converted, rawId], true)).result?.ok,
      true,
    );
    assert.equal(
      (await action("moderateProject", [rawId, "publish"], true)).result?.ok,
      true,
    );
    const publicRaw = await (
      await fetch(origin + `/pt/projects/${rawRecord.slug}`)
    ).text();
    assert.ok(publicRaw.includes(raw.title));
    assert.ok(!publicRaw.includes(raw.email));
    assert.ok(!publicRaw.includes("PRIVATE-RAW-STORY"));
    console.log(
      "PASS: raw stories persist privately, cannot be published, and become publishable only after moderator completion.",
    );

    assert.equal(
      (await fetch(origin + `/admin/${id}`, { headers: { Cookie: cookie } }))
        .status,
      200,
    );
    assert.equal(
      (
        await fetch(origin + `/admin/${id}/edit`, {
          headers: { Cookie: cookie },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(origin + record.coverImage.url, {
          headers: { Cookie: cookie },
        })
      ).status,
      200,
    );
    const crossed = await action(
      "moderateProject",
      [id, "publish"],
      true,
      "https://attacker.example",
    );
    assert.ok(!crossed.result?.ok);
    assert.equal(
      (await action("moderateProject", [id, "publish"], true)).result?.ok,
      true,
    );
    const published = await (
      await fetch(origin + `/projects/${record.slug}`)
    ).text();
    assert.match(published, /HTTP smoke project/);
    assert.ok(!published.includes(input.email));
    assert.match(published, /application\/ld\+json/);
    assert.equal((await fetch(origin + record.coverImage.url)).status, 200);
    const archive = await (await fetch(origin + "/graveyard")).text();
    assert.ok(!archive.includes(input.email));
    assert.match(archive, /HTTP smoke project/);
    console.log(
      "PASS: admin login, private previews, origin protection and publish work; public pages contain no private email.",
    );
    const edited = new FormData();
    edited.set(
      "project",
      JSON.stringify({
        ...input,
        title: "Edited HTTP project",
        coverImage: null,
      }),
    );
    assert.equal(
      (await action("saveSubmission", [edited, id], true)).result?.ok,
      true,
    );
    assert.match(
      await (await fetch(origin + `/projects/${record.slug}`)).text(),
      /Edited HTTP project/,
    );
    assert.equal((await fetch(origin + record.coverImage.url)).status, 404);
    assert.equal(
      (await action("moderateProject", [id, "reject"], true)).result?.ok,
      true,
    );
    assert.equal(
      (await fetch(origin + `/projects/${record.slug}`)).status,
      404,
    );
    assert.equal(
      (await action("moderateProject", [id, "delete"], true)).result?.ok,
      true,
    );
    await assert.rejects(() =>
      readFile(path.join(directory, "projects", `${id}.json`)),
    );
    const founderForm = new FormData();
    founderForm.set("project", JSON.stringify(input));
    founderForm.set("founder", "true");
    assert.equal(
      (await action("saveSubmission", [founderForm])).result?.ok,
      false,
    );
    for (const title of ["Founder project one", "Founder project two"]) {
      founderForm.set("project", JSON.stringify({ ...input, title }));
      const founder = await action("saveSubmission", [founderForm], true);
      assert.equal(founder.result?.ok, true, founder.text);
      const founderRecord = JSON.parse(
        await readFile(
          path.join(directory, "projects", `${founder.result.id}.json`),
          "utf8",
        ),
      );
      assert.equal(founderRecord.isFounder, true);
      assert.equal(founderRecord.isDemo, false);
      assert.equal(founderRecord.moderationStatus, "submitted");
      assert.equal(
        (await action("moderateProject", [founder.result.id, "publish"], true))
          .result?.ok,
        true,
      );
    }
    const readyDashboard = await (
      await fetch(origin + "/admin", { headers: { Cookie: cookie } })
    ).text();
    assert.match(
      readyDashboard.replace(/<!--.*?-->/g, ""),
      /2\/2 founder projects published/,
    );
    console.log(
      "PASS: only the admin can add founder projects; both require explicit publication and count toward launch readiness.",
    );
    await action("logoutAdmin", [], true);
    console.log(
      "PASS: persisted editing, image withdrawal, rejection, deletion and sign-out complete.",
    );
  } finally {
    server.kill("SIGTERM");
    await Promise.race([
      once(server, "exit"),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
    if (server.exitCode === null) server.kill("SIGKILL");
    await rm(directory, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
