import { test } from "@jest/globals";
import { example } from "../src/index";

test("Smoke test", async () => {
  await example();
});
