const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { prepareCitations } = require("./prepare-citations");
const { encryptDirectory } = require("./encrypt-json");

test("packages public and encrypted sources without retaining public copies", async () => {
  const before = process.cwd();
  const password = process.env.FAMILY_TREE_PASSWORD;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "citation-test-"));
  try {
    process.chdir(temp);
    fs.writeFileSync("source.pdf", "%PDF-1.6\ntest fixture");
    const config = {
      sources: {
        pages: { file: "source.pdf", visibility: "public", pageOffset: 2 },
      },
    };
    fs.writeFileSync("reference-material.json", JSON.stringify(config));
    prepareCitations("genea.doc");
    assert.equal(
      JSON.parse(fs.readFileSync("public/reference-material/pages.json"))
        .pageOffset,
      2,
    );
    assert.equal(
      fs.readFileSync("public/reference-material/pages.pdf", "utf8"),
      "%PDF-1.6\ntest fixture",
    );
    config.sources.pages.visibility = "encrypted";
    fs.writeFileSync("reference-material.json", JSON.stringify(config));
    delete process.env.FAMILY_TREE_PASSWORD;
    assert.throws(
      () => prepareCitations("genea.doc"),
      /requires FAMILY_TREE_PASSWORD/,
    );
    process.env.FAMILY_TREE_PASSWORD = "test-only-password";
    prepareCitations("genea.doc");
    await encryptDirectory("public/api/v1");
    assert.equal(fs.existsSync("public/reference-material/pages.pdf"), false);
    assert.equal(fs.existsSync("public/api/v1/source-pages.json"), false);
    const envelope = JSON.parse(
      fs.readFileSync("public/api/v1/source-pages.json.enc"),
    );
    assert.ok(envelope.salt && envelope.iv && envelope.data);
  } finally {
    process.chdir(before);
    if (password === undefined) delete process.env.FAMILY_TREE_PASSWORD;
    else process.env.FAMILY_TREE_PASSWORD = password;
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("matches name words independently and highlights every occurrence", async () => {
  const { matchingItems } = await import("../public/citation-search.mjs");
  const items = [
    { textContent: "Jane married someone." },
    { textContent: "Doe appears elsewhere. Jane again." },
  ];
  const matches = matchingItems(items, "Jane Doe");
  assert.deepEqual(
    matches.map(({ index, start, end }) =>
      items[index].textContent.slice(start, end),
    ),
    ["Jane", "Doe", "Jane"],
  );
  assert.equal(
    matchingItems([{ textContent: "Jane only" }], "Jane Doe").length,
    1,
  );
});

test("matches whole words with original offsets, ignoring case and accents", async () => {
  const { matchingItems } = await import("../public/citation-search.mjs");
  const items = [{ textContent: "😀 JÁNE, Jane Doe; Janette Does." }];
  const matches = matchingItems(items, "jane JANE doe");
  assert.deepEqual(
    matches.map(({ start, end }) => items[0].textContent.slice(start, end)),
    ["JÁNE", "Jane", "Doe"],
  );
  assert.deepEqual(matchingItems(items, "  --  "), []);
  assert.deepEqual(matchingItems(items, "missing"), []);
});
