import { defineConfig } from "vitepress";

const description =
  "PatchProof proves that a changed regression test fails before a fix and passes after it.";

export default defineConfig({
  title: "PatchProof",
  description,
  base: "/PatchProof/",
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: "https://jayadityavetsa.github.io/PatchProof/" },
  head: [
    ["link", { rel: "canonical", href: "https://jayadityavetsa.github.io/PatchProof/" }],
    ["meta", { property: "og:title", content: "PatchProof" }],
    ["meta", { property: "og:description", content: description }],
    ["meta", { property: "og:type", content: "website" }],
    [
      "meta",
      {
        property: "og:url",
        content: "https://jayadityavetsa.github.io/PatchProof/",
      },
    ],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "PatchProof",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Linux, macOS, Windows",
        softwareVersion: "0.1.0-alpha.2",
        license: "https://www.apache.org/licenses/LICENSE-2.0",
        codeRepository: "https://github.com/JayadityaVetsa/PatchProof",
        downloadUrl: "https://www.npmjs.com/package/@jayadityavetsa/patchproof",
        description,
      }),
    ],
  ],
  themeConfig: {
    search: { provider: "local" },
    nav: [
      { text: "Guide", link: "/getting-started/" },
      { text: "Reference", link: "/cli/" },
      { text: "Benchmarks", link: "/benchmarks/" },
      { text: "npm", link: "https://www.npmjs.com/package/@jayadityavetsa/patchproof" },
      { text: "GitHub", link: "https://github.com/JayadityaVetsa/PatchProof" },
    ],
    sidebar: [
      {
        text: "Start",
        items: [
          { text: "What PatchProof proves", link: "/" },
          { text: "Installation and first proof", link: "/getting-started/" },
          { text: "How test selection works", link: "/selection/" },
          { text: "Statuses and exit codes", link: "/statuses/" },
        ],
      },
      {
        text: "Use",
        items: [
          { text: "CLI reference", link: "/cli/" },
          { text: "Configuration", link: "/configuration/" },
          { text: "pytest", link: "/frameworks/pytest" },
          { text: "Jest and Vitest", link: "/frameworks/javascript" },
          { text: "GitHub Action", link: "/github-action/" },
          { text: "AI coding agents", link: "/ai-agents/" },
        ],
      },
      {
        text: "Trust",
        items: [
          { text: "Security", link: "/security/" },
          { text: "Privacy", link: "/privacy/" },
          { text: "Compatibility", link: "/compatibility/" },
          { text: "Limitations", link: "/limitations/" },
          { text: "Troubleshooting", link: "/troubleshooting/" },
        ],
      },
      {
        text: "Evidence",
        items: [
          { text: "Benchmarks", link: "/benchmarks/" },
          { text: "Compared with adjacent tools", link: "/comparisons/" },
          { text: "FAQ", link: "/faq/" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/JayadityaVetsa/PatchProof" }],
    footer: {
      message: "Deterministic regression-test evidence. No telemetry or required AI.",
      copyright: "Apache-2.0",
    },
  },
});
