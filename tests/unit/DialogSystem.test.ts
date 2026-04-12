import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DialogSystem,
  wordWrap,
  paginateDialog,
  interpolateText,
  interpolateLines,
} from "@/game/systems/DialogSystem";
import { GameEvents } from "@/game/EventBridge";
import { clearSave, updateSave } from "@/game/systems/GameSave";

describe("DialogSystem", () => {
  beforeEach(() => {
    clearSave();
  });

  afterEach(() => {
    clearSave();
  });

  describe("B3 — double-showDialog guard", () => {
    it("rejects the second showDialog call while the first is still open", async () => {
      const ds = new DialogSystem();
      const p1 = ds.showDialog({ lines: ["first"] });
      let secondError: Error | null = null;
      try {
        await ds.showDialog({ lines: ["second"] });
      } catch (err) {
        secondError = err as Error;
      }
      expect(secondError).toBeInstanceOf(Error);
      expect(secondError?.message).toContain(
        "another dialog is still open",
      );
      // Clean up so the first promise resolves and we don't leak it.
      window.dispatchEvent(new CustomEvent(GameEvents.DIALOG_COMPLETE));
      await p1;
      expect(ds.active).toBe(false);
      ds.destroy();
    });

    it("active flag flows through the full lifecycle", async () => {
      const ds = new DialogSystem();
      expect(ds.active).toBe(false);
      const p1 = ds.showDialog({ lines: ["hello"] });
      expect(ds.active).toBe(true);
      window.dispatchEvent(new CustomEvent(GameEvents.DIALOG_COMPLETE));
      await p1;
      expect(ds.active).toBe(false);
      ds.destroy();
    });

    it("resolves cleanly after DIALOG_COMPLETE event", async () => {
      const ds = new DialogSystem();
      const p = ds.showDialog({ lines: ["hello"] });
      // Fire completion on next microtask
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent(GameEvents.DIALOG_COMPLETE));
      });
      await expect(p).resolves.toBeUndefined();
      ds.destroy();
    });

    it("emits SHOW_DIALOG with paginated lines", async () => {
      const ds = new DialogSystem();
      const received: unknown[] = [];
      const listener = (e: Event) => {
        received.push((e as CustomEvent).detail);
      };
      window.addEventListener(GameEvents.SHOW_DIALOG, listener);
      const p1 = ds.showDialog({
        lines: ["Hello there! Welcome to the world of POKeMON!"],
      });
      window.dispatchEvent(new CustomEvent(GameEvents.DIALOG_COMPLETE));
      await p1;
      window.removeEventListener(GameEvents.SHOW_DIALOG, listener);
      expect(received.length).toBe(1);
      const detail = received[0] as { lines: string[] };
      expect(detail.lines.length).toBeGreaterThan(0);
      expect(detail.lines.join(" ")).toContain("POKeMON");
      ds.destroy();
    });
  });

  describe("interpolateText", () => {
    it("replaces {NAME} with the save's playerName", () => {
      updateSave({ playerName: "ASH" });
      expect(interpolateText("Hi, {NAME}!")).toBe("Hi, ASH!");
    });

    it("falls back to TRAINER when playerName is empty", () => {
      // clearSave() in beforeEach resets playerName to ""
      expect(interpolateText("Hi, {NAME}!")).toBe("Hi, TRAINER!");
    });

    it("handles multiple {NAME} occurrences", () => {
      updateSave({ playerName: "RED" });
      expect(interpolateText("{NAME} meets {NAME}.")).toBe("RED meets RED.");
    });

    it("interpolateLines maps each entry", () => {
      updateSave({ playerName: "GARY" });
      expect(interpolateLines(["Hi {NAME}", "Bye {NAME}"])).toEqual([
        "Hi GARY",
        "Bye GARY",
      ]);
    });
  });

  describe("wordWrap", () => {
    it("wraps at the given max width at word boundaries", () => {
      const lines = wordWrap("one two three four five six seven", 10);
      // Each line ≤ 10 chars after joining
      lines.forEach((l) => expect(l.length).toBeLessThanOrEqual(10));
    });

    it("keeps words intact (no mid-word breaks)", () => {
      const lines = wordWrap("supercalifragilistic expialidocious", 10);
      // First word is longer than the limit — still kept as its own line
      expect(lines[0]).toBe("supercalifragilistic");
    });

    it("returns empty array for empty string", () => {
      expect(wordWrap("", 10)).toEqual([]);
    });
  });

  describe("paginateDialog", () => {
    it("groups lines into 2-line pages by default", () => {
      const pages = paginateDialog(["alpha", "beta", "gamma", "delta"]);
      expect(pages.length).toBe(2);
      expect(pages[0]).toBe("alpha\nbeta");
      expect(pages[1]).toBe("gamma\ndelta");
    });

    it("treats empty strings as forced page breaks", () => {
      const pages = paginateDialog(["alpha", "", "beta"]);
      expect(pages.length).toBe(2);
      expect(pages[0]).toBe("alpha");
      expect(pages[1]).toBe("beta");
    });

    it("word-wraps long lines before pagination", () => {
      // The longer line must pick a wrap width that's <= viewport's
      // column count. happy-dom defaults innerWidth to 1024, so wrap
      // column is 36 per viewportWrapWidth().
      const pages = paginateDialog([
        "This is a really long sentence that has to wrap at the boundary.",
      ]);
      // Joined result must still contain all the original words.
      const joined = pages.join(" ").replace(/\n/g, " ");
      expect(joined).toContain("really long sentence");
    });
  });
});
