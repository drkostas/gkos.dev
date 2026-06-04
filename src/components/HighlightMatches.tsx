import { useEffect } from "react";

/**
 * Reads `?q=` from the URL and highlights matches inside the article body.
 * Only touches text nodes; never descends into <pre>, <code>, <kbd>, or <mark>.
 * Safe to include on every post — no-op when the param is missing.
 */
export function HighlightMatches({ selector = "article .prose" }: { selector?: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("q");
    if (!q || q.length < 2) return;

    const container = document.querySelector(selector);
    if (!container) return;

    const SKIP_TAGS = new Set(["PRE", "CODE", "KBD", "MARK", "SCRIPT", "STYLE", "NOSCRIPT"]);

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        let parent = node.parentElement;
        while (parent && parent !== container) {
          if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          parent = parent.parentElement;
        }
        return node.nodeValue && node.nodeValue.trim().length > 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });

    const needle = q.toLowerCase();
    const targets: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      if (current.nodeValue && current.nodeValue.toLowerCase().includes(needle)) {
        targets.push(current as Text);
      }
      current = walker.nextNode();
    }

    // Wrap each match with a <mark>. Done in a second pass so we don't mutate
    // the tree while walking it.
    let firstMark: HTMLElement | null = null;
    const createdMarks: HTMLElement[] = [];
    for (const textNode of targets) {
      const text = textNode.nodeValue || "";
      const lower = text.toLowerCase();
      const frag = document.createDocumentFragment();
      let cursor = 0;
      while (cursor < text.length) {
        const idx = lower.indexOf(needle, cursor);
        if (idx === -1) {
          frag.appendChild(document.createTextNode(text.slice(cursor)));
          break;
        }
        if (idx > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, idx)));
        const mark = document.createElement("mark");
        // Linear 10s transition: from yellow on mount to transparent when we
        // strip the bg class below. Fade looks uniform over the full duration.
        mark.className = "rounded-sm bg-yellow-200/60 px-0.5 text-text-primary transition-colors duration-[10000ms] ease-linear dark:bg-yellow-400/30";
        mark.dataset.searchMark = "true";
        mark.textContent = text.slice(idx, idx + needle.length);
        if (!firstMark) firstMark = mark;
        createdMarks.push(mark);
        frag.appendChild(mark);
        cursor = idx + needle.length;
      }
      textNode.parentNode?.replaceChild(frag, textNode);
    }

    // Gentle auto-scroll to the first match so the user lands on context.
    if (firstMark) {
      firstMark.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Trigger the 10s fade immediately after mount.
    // Double rAF ensures the browser commits the initial yellow bg before we
    // flip to transparent — otherwise the transition wouldn't animate.
    // <mark> has a browser-default bright yellow background, so we both strip
    // our custom classes AND force transparent inline to beat the UA rule.
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        for (const mark of createdMarks) {
          mark.classList.remove("bg-yellow-200/60", "dark:bg-yellow-400/30");
          mark.style.backgroundColor = "transparent";
        }
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [selector]);

  return null;
}
