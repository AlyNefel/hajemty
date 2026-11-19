import { test } from "node:test";
import assert from "node:assert/strict";
import { editDistance, fold, scoreDocument, tokenScore, tokenize } from "./match.ts";

test("fold removes accents and case", () => {
  assert.equal(fold("Épilation Laser À Tunis"), "epilation laser a tunis");
});

test("tokenize drops stop words", () => {
  assert.deepEqual(tokenize("Coiffeur à La Marsa"), ["coiffeur", "marsa"]);
});

test("edit distance with cap", () => {
  assert.equal(editDistance("hamam", "hammam"), 1);
  assert.equal(editDistance("abc", "xyzuvw", 1), 2);
});

test("token matching: exact > prefix > stem > typo", () => {
  assert.equal(tokenScore("spa", "spa"), 1);
  assert.equal(tokenScore("coif", "coiffure"), 0.8);
  assert.equal(tokenScore("coiffeur", "coiffure"), 0.75);
  assert.equal(tokenScore("hamam", "hammam"), 0.6);
  assert.equal(tokenScore("nail", "barbier"), 0);
});

test("document scoring requires every token", () => {
  const doc = [{ text: "Maison Jasmin", weight: 3 }, { text: "Institut de beauté La Marsa", weight: 1 }, { text: "Rituel hammam & gommage", weight: 1.5 }];
  assert.ok(scoreDocument("hammam marsa", doc) > 0);
  assert.equal(scoreDocument("hammam sfax", doc), 0);
  assert.ok(scoreDocument("jasmin", doc) > scoreDocument("marsa", doc), "name matches outrank description matches");
  assert.ok(scoreDocument("hamam", doc) > 0, "typo tolerated");
  assert.equal(scoreDocument("", doc), 1);
});
