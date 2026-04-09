import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "fs";
import sharp from "sharp";

const original = readFileSync("src/components/GridWrapper.astro", "utf8");

const options = [
  {
    name: "current",
    title: "Current — top + bottom lines on every section",
    code: original, // no change
  },
  {
    name: "top-only",
    title: "Top line only — remove bottom lines",
    code: original
      .replace(/after:-left-4.*?after:bg-border-primary\/50/s,
        "after:hidden")
      .replace('"after:-left-4 after:right-[-1rem] md:after:-left-8 md:after:right-[-2rem] lg:after:inset-x-0",',
        '')
      .replace('"after:absolute after:bottom-0 after:h-px after:bg-border-primary/50",', ''),
  },
  {
    name: "gradient",
    title: "Gradient fade lines — edges transparent",
    code: `---
interface Props {
  class?: string;
}

const { class: className } = Astro.props;
---

<div
  class:list={[
    className,
    "relative w-full",
  ]}
>
  <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-primary/60 to-transparent"></div>
  <slot />
  <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-primary/60 to-transparent"></div>
</div>`,
  },
  {
    name: "dots",
    title: "Dotted separator lines",
    code: `---
interface Props {
  class?: string;
}

const { class: className } = Astro.props;
---

<div
  class:list={[
    className,
    "relative w-full",
    "before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:border-t before:border-dotted before:border-border-primary/40",
    "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:border-t after:border-dotted after:border-border-primary/40",
  ]}
>
  <slot />
</div>`,
  },
  {
    name: "no-lines",
    title: "No lines — spacing only",
    code: `---
interface Props {
  class?: string;
}

const { class: className } = Astro.props;
---

<div
  class:list={[
    className,
    "relative w-full",
  ]}
>
  <slot />
</div>`,
  },
];

const browser = await chromium.launch();

for (const opt of options) {
  console.log(`${opt.name}: ${opt.title}`);
  writeFileSync("src/components/GridWrapper.astro", opt.code);
  await new Promise(r => setTimeout(r, 3000));
  
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:4321/", { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `/tmp/lines-${opt.name}.png`, fullPage: true });
  
  // Crop the About section area
  await sharp(`/tmp/lines-${opt.name}.png`)
    .extract({ left: 30, top: 920, width: 1380, height: 250 })
    .toFile(`tests/audit/lines-${opt.name}.png`);
  
  await ctx.close();
}

// Restore original
writeFileSync("src/components/GridWrapper.astro", original);
console.log("Original restored.");
await browser.close();
