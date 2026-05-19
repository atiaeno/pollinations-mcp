// © Atia Hegazy — atiaeno.com

const BASE_URL = "https://image.pollinations.ai/prompt";

function detectSizeFromPrompt(prompt) {
  const p = prompt.toLowerCase();
  if (p.includes("logo") || p.includes("icon") || p.includes("favicon") || p.includes("app icon")) {
    return { width: 512, height: 512 };
  }
  if (p.includes("avatar") || p.includes("profile") || p.includes("portrait")) {
    return { width: 512, height: 512 };
  }
  if (p.includes("instagram") || p.includes("social media") || p.includes("post")) {
    return { width: 1080, height: 1080 };
  }
  if (p.includes("twitter") || p.includes("x post") || p.includes("tweet")) {
    return { width: 1200, height: 675 };
  }
  if (p.includes("hero") || p.includes("header banner")) {
    return { width: 1920, height: 1080 };
  }
  if (p.includes("background") || p.includes("wallpaper") || p.includes("desktop")) {
    return { width: 1920, height: 1080 };
  }
  return { width: 1024, height: 1024 };
}

function buildUrl(prompt, opts = {}) {
  const autoSize = opts.autoSize;
  const detected = autoSize ? detectSizeFromPrompt(prompt) : null;
  const {
    width = detected?.width || 1024,
    height = detected?.height || 1024,
    model = "flux",
    seed,
    nologo = true,
    enhance = false,
    transparent = false,
    private: isPrivate = false,
    safe = false,
  } = opts;
  const encoded = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    width,
    height,
    model,
    nologo,
    enhance,
    ...(seed !== undefined ? { seed } : {}),
    ...(transparent ? { transparent: true } : {}),
    ...(isPrivate ? { private: true } : {}),
    ...(safe ? { safe: true } : {}),
  });
  return `${BASE_URL}/${encoded}?${params.toString()}`;
}

console.log("Testing URL generation...\n");

const tests = [
  {
    name: "Basic image generation",
    prompt: "a red apple",
    opts: {},
    check: (url) => url.includes("a%20red%20apple") && url.includes("width=1024") && url.includes("height=1024")
  },
  {
    name: "Auto-size for logo",
    prompt: "a beautiful logo for my brand",
    opts: { autoSize: true },
    check: (url) => url.includes("width=512") && url.includes("height=512")
  },
  {
    name: "Auto-size for hero",
    prompt: "hero section for website",
    opts: { autoSize: true },
    check: (url) => url.includes("width=1920") && url.includes("height=1080")
  },
  {
    name: "Custom dimensions",
    prompt: "landscape photo",
    opts: { width: 800, height: 600 },
    check: (url) => url.includes("width=800") && url.includes("height=600")
  },
  {
    name: "Custom model",
    prompt: "anime style art",
    opts: { model: "flux-anime" },
    check: (url) => url.includes("model=flux-anime")
  },
  {
    name: "With seed",
    prompt: "consistent image",
    opts: { seed: 12345 },
    check: (url) => url.includes("seed=12345")
  },
  {
    name: "Transparent",
    prompt: "icon with transparent background",
    opts: { transparent: true },
    check: (url) => url.includes("transparent=true")
  },
  {
    name: "Private",
    prompt: "private image",
    opts: { private: true },
    check: (url) => url.includes("private=true")
  },
  {
    name: "Safe mode",
    prompt: "family friendly image",
    opts: { safe: true },
    check: (url) => url.includes("safe=true")
  },
  {
    name: "Enhance",
    prompt: "detailed prompt",
    opts: { enhance: true },
    check: (url) => url.includes("enhance=true")
  }
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  const url = buildUrl(test.prompt, test.opts);
  const result = test.check(url);
  
  if (result) {
    console.log(`✓ ${test.name}`);
    passed++;
  } else {
    console.log(`✗ ${test.name}`);
    console.log(`  URL: ${url}`);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
