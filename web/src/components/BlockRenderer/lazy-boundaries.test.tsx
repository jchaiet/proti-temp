import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  loaders: [] as Array<() => Promise<unknown>>,
  imported: [] as string[],
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    state.loaders.push(loader);
    // The real next/dynamic preserves server rendering. This stub checks that
    // importing a lazy boundary does not eagerly evaluate its implementation.
    return function LazyTestBoundary() {
      return null;
    };
  },
}));

vi.mock("./Form", () => {
  state.imported.push("Form");
  return {
    Form: function Form() {
      return null;
    },
  };
});

vi.mock("./Poll", () => {
  state.imported.push("Poll");
  return {
    Poll: function Poll() {
      return null;
    },
  };
});

vi.mock("./DocumentList", () => {
  state.imported.push("DocumentList");
  return {
    DocumentList: function DocumentList() {
      return null;
    },
  };
});

import { FormLazy } from "./FormLazy";
import { PollLazy } from "./PollLazy";
import { DocumentListLazy } from "./DocumentListLazy";

describe("optional block client boundaries", () => {
  it("registers separate dynamic loaders without eagerly importing block implementations", () => {
    expect(typeof FormLazy).toBe("function");
    expect(typeof PollLazy).toBe("function");
    expect(typeof DocumentListLazy).toBe("function");
    expect(state.loaders).toHaveLength(3);
    expect(state.imported).toEqual([]);
  });

  it("resolves each loader to the matching named implementation", async () => {
    const modules = await Promise.all(state.loaders.map((load) => load()));
    const exportedNames = modules.map((module) =>
      typeof module === "function" ? module.name : "unknown",
    );

    expect(exportedNames).toEqual(
      expect.arrayContaining(["Form", "Poll", "DocumentList"]),
    );
    expect(state.imported).toEqual(
      expect.arrayContaining(["Form", "Poll", "DocumentList"]),
    );
  });
});
