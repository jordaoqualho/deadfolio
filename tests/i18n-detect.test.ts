import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectLocale,
  localePrefixPath,
  readLocaleCookie,
} from "../src/lib/i18n/detect";

test("detectLocale prefers Portuguese from Accept-Language", () => {
  assert.equal(detectLocale("pt-BR,pt;q=0.9,en;q=0.8"), "pt");
  assert.equal(detectLocale("pt-PT"), "pt");
  assert.equal(detectLocale("en-US,en;q=0.9"), "en");
  assert.equal(detectLocale(null), "en");
});

test("detectLocale respects quality values", () => {
  assert.equal(detectLocale("en-US;q=0.8,pt-BR;q=0.9"), "pt");
  assert.equal(detectLocale("fr-FR,fr;q=0.9,en;q=0.8"), "en");
});

test("locale cookie and prefix helpers stay stable", () => {
  assert.equal(readLocaleCookie("pt"), "pt");
  assert.equal(readLocaleCookie("en"), "en");
  assert.equal(readLocaleCookie("fr"), null);
  assert.equal(localePrefixPath("/", "pt"), "/pt");
  assert.equal(localePrefixPath("/graveyard", "pt"), "/pt/graveyard");
  assert.equal(localePrefixPath("/pt/about", "en"), "/about");
  assert.equal(localePrefixPath("/admin/new", "pt"), "/admin/new");
});
