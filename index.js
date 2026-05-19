#!/usr/bin/env node
// © Atia Hegazy — atiaeno.com
// Pollinations MCP Server — Free AI Image Generation for Windsurf

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE_URL = "https://image.pollinations.ai/prompt";

// Get images folder path (next to index.js)
function getImagesFolder() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const imagesPath = path.join(__dirname, "images");
  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }
  return imagesPath;
}

// Download and save image to local folder
async function downloadToLocal(url, prefix = "image") {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

  const buffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type") || "image/png";
  const ext = mimeType.split("/")[1] || "png";

  const timestamp = Date.now();
  const filename = `${prefix}_${timestamp}.${ext}`;
  const filepath = path.join(getImagesFolder(), filename);

  fs.writeFileSync(filepath, Buffer.from(buffer));

  return { filepath, filename, size: buffer.byteLength, mimeType };
}

// ─── Auto-size detection ─────────────────────────────────────────────────────

function detectSizeFromPrompt(prompt) {
  const p = prompt.toLowerCase();

  // Icon/Logo sizes
  if (p.includes("logo") || p.includes("icon") || p.includes("favicon") || p.includes("app icon")) {
    return { width: 512, height: 512 };
  }
  // Avatar/Profile
  if (p.includes("avatar") || p.includes("profile") || p.includes("portrait")) {
    return { width: 512, height: 512 };
  }
  // Social media post
  if (p.includes("instagram") || p.includes("social media") || p.includes("post")) {
    return { width: 1080, height: 1080 };
  }
  // Twitter/X post
  if (p.includes("twitter") || p.includes("x post") || p.includes("tweet")) {
    return { width: 1200, height: 675 };
  }
  // Facebook cover
  if (p.includes("facebook cover") || p.includes("fb cover")) {
    return { width: 820, height: 312 };
  }
  // YouTube thumbnail
  if (p.includes("youtube thumbnail") || p.includes("yt thumbnail")) {
    return { width: 1280, height: 720 };
  }
  // Hero section
  if (p.includes("hero") || p.includes("header banner")) {
    return { width: 1920, height: 1080 };
  }
  // Website background
  if (p.includes("background") || p.includes("wallpaper") || p.includes("desktop")) {
    return { width: 1920, height: 1080 };
  }
  // Banner
  if (p.includes("banner") || p.includes("ad") || p.includes("advertisement")) {
    return { width: 1200, height: 628 };
  }
  // Card/Thumbnail
  if (p.includes("card") || p.includes("thumbnail")) {
    return { width: 800, height: 600 };
  }
  // Story (Instagram/Facebook)
  if (p.includes("story")) {
    return { width: 1080, height: 1920 };
  }
  // Portrait/Vertical
  if (p.includes("portrait") || p.includes("vertical")) {
    return { width: 768, height: 1024 };
  }
  // Square (default for general)
  return { width: 1024, height: 1024 };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

async function formatResult(url, prompt, opts) {
  let localPath = "";
  try {
    const local = await downloadToLocal(url, "image");
    localPath = `\n📁 Saved to: ${local.filepath}`;
  } catch (e) {
    // Download failed, continue with URL only
  }

  return {
    content: [
      {
        type: "text",
        text: [
          `✅ Image generated successfully!`,
          ``,
          `📋 Prompt: ${prompt}`,
          `📐 Size: ${opts.width}x${opts.height}${opts.autoSize ? " (auto-detected)" : ""}`,
          `🤖 Model: ${opts.model || "flux"}${opts.transparent ? " | 🔳 Transparent" : ""}${opts.quality ? ` | ⚡ ${opts.quality}` : ""}`,
          ``,
          `🔗 URL (use directly in <img> or download):`,
          url,
          localPath,
          ``,
          `💡 Tip: The URL is permanent — same prompt+seed = same image always.`,
        ].join("\n"),
      },
    ],
  };
}

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "generate_image",
    description:
      "Generate any AI image from a text prompt using Pollinations.ai (free, no API key). Returns a direct image URL.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Detailed description of the image you want to generate",
        },
        width: { type: "number", description: "Width in px (default: 1024)" },
        height: { type: "number", description: "Height in px (default: 1024)" },
        model: {
          type: "string",
          enum: ["flux", "flux-realism", "flux-anime", "flux-3d", "turbo"],
          description: "Model to use (default: flux)",
        },
        seed: {
          type: "number",
          description: "Seed for reproducibility (optional)",
        },
        enhance: {
          type: "boolean",
          description: "Auto-enhance prompt with AI (default: false)",
        },
        autoSize: {
          type: "boolean",
          description: "Auto-detect best size based on prompt (logo, hero, banner, etc.) - default: true",
        },
        transparent: {
          type: "boolean",
          description: "Generate with transparent background - default: false",
        },
        private: {
          type: "boolean",
          description: "Keep generation private (not shown in public feed) - default: false",
        },
        safe: {
          type: "boolean",
          description: "Enable safe mode (filter inappropriate content) - default: false",
        },
        quality: {
          type: "string",
          enum: ["standard", "high", "ultra"],
          description: "Quality preset: standard (fast), high (balanced), ultra (best quality) - default: high",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_logo",
    description:
      "Generate a logo or icon image. Automatically adds logo-optimized settings (square, clean background).",
    inputSchema: {
      type: "object",
      properties: {
        brand_name: {
          type: "string",
          description: "The brand or company name",
        },
        style: {
          type: "string",
          description:
            'Logo style, e.g. "minimalist", "geometric", "3D", "flat", "badge", "wordmark"',
        },
        colors: {
          type: "string",
          description: 'Color palette, e.g. "deep blue and gold"',
        },
        industry: {
          type: "string",
          description: 'Industry context, e.g. "tech startup", "luxury brand"',
        },
        extra: {
          type: "string",
          description: "Any additional details for the logo",
        },
        size: {
          type: "number",
          description: "Square size in px (default: 512)",
        },
      },
      required: ["brand_name", "style"],
    },
  },
  {
    name: "generate_background",
    description:
      "Generate a website background, hero image, or abstract wallpaper. Automatically uses wide/landscape dimensions.",
    inputSchema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description:
            'What kind of background, e.g. "dark abstract geometric", "soft pastel gradient waves"',
        },
        mood: {
          type: "string",
          description:
            'Mood/feel, e.g. "professional", "futuristic", "warm", "minimal"',
        },
        colors: {
          type: "string",
          description: 'Dominant colors, e.g. "navy blue with cyan accents"',
        },
        usage: {
          type: "string",
          enum: ["hero", "section", "card", "full-page", "banner"],
          description: "Where this will be used (affects aspect ratio)",
        },
        width: {
          type: "number",
          description: "Custom width override (optional)",
        },
        height: {
          type: "number",
          description: "Custom height override (optional)",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "generate_variants",
    description:
      "Generate multiple variants of the same concept (different seeds). Returns 3 image URLs for A/B comparison.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "The image prompt to generate variants for",
        },
        count: {
          type: "number",
          description: "Number of variants (2-5, default: 3)",
        },
        width: { type: "number", description: "Width in px (default: 1024)" },
        height: {
          type: "number",
          description: "Height in px (default: 1024)",
        },
        model: {
          type: "string",
          enum: ["flux", "flux-realism", "flux-anime", "flux-3d", "turbo"],
          description: "Model (default: flux)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "download_image",
    description:
      "Download an image from a URL and return it as base64. Useful for saving generated images.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The image URL to download",
        },
        filename: {
          type: "string",
          description: "Optional filename to save as (without extension)",
        },
      },
      required: ["url"],
    },
  },
];

// ─── Tool Handlers ───────────────────────────────────────────────────────────

// ─── Quality Configurations ────────────────────────────────────────────────

const QUALITY_CONFIGS = {
  standard: { model: "flux", enhance: false },
  high: { model: "flux", enhance: true },
  ultra: { model: "flux-realism", enhance: true },
};

async function handleGenerateImage(args) {
  // Validate required prompt
  if (!args?.prompt || typeof args.prompt !== "string" || args.prompt.trim().length === 0) {
    throw new Error("Prompt is required and must be a non-empty string");
  }

  const {
    prompt,
    width,
    height,
    model,
    seed,
    enhance,
    autoSize = true,
    transparent,
    private: isPrivate,
    safe,
    quality = "high",
  } = args;

  // Apply quality preset (can be overridden by explicit model)
  const qualityConfig = QUALITY_CONFIGS[quality] || QUALITY_CONFIGS.high;
  const finalModel = model || qualityConfig.model;
  const finalEnhance = enhance !== undefined ? enhance : qualityConfig.enhance;

  const opts = {
    prompt: prompt.trim(),
    width,
    height,
    model: finalModel,
    seed,
    enhance: finalEnhance,
    autoSize,
    transparent,
    private: isPrivate,
    safe,
  };

  const detected = autoSize ? detectSizeFromPrompt(prompt) : null;
  const finalDims = {
    width: width || detected?.width || 1024,
    height: height || detected?.height || 1024,
  };

  const url = buildUrl(prompt, opts);

  return await formatResult(url, prompt, { ...opts, ...finalDims, quality });
}

async function handleGenerateLogo(args) {
  // Validate required fields
  if (!args?.brand_name || typeof args.brand_name !== "string") {
    throw new Error("brand_name is required and must be a string");
  }
  if (!args?.style || typeof args.style !== "string") {
    throw new Error("style is required and must be a string");
  }

  const { brand_name, style, colors, industry, extra, size = 512 } = args;

  const parts = [
    `${style} professional logo for "${brand_name}"`,
    industry ? `${industry}` : null,
    colors ? `color palette: ${colors}` : null,
    `transparent background, vector style, clean design, high quality, crisp edges, professional branding`,
    extra || null,
  ].filter(Boolean);

  const prompt = parts.join(", ");
  // Use higher resolution and ultra quality for logos
  const opts = {
    width: size,
    height: size,
    model: "flux-realism",
    nologo: true,
    transparent: true,
    enhance: true,
  };
  const url = buildUrl(prompt, opts);
  return await formatResult(url, prompt, { ...opts, quality: "ultra" });
}

async function handleGenerateBackground(args) {
  if (!args?.description || typeof args.description !== "string") {
    throw new Error("description is required and must be a string");
  }

  const { description, mood, colors, usage, width, height } = args;

  // Smart dimensions based on usage - higher resolution for better quality
  const dimensionMap = {
    hero: { w: 2560, h: 1440 },      // 2K for hero
    section: { w: 1920, h: 800 },    // Higher res section
    card: { w: 1200, h: 900 },       // Better card quality
    "full-page": { w: 1920, h: 1080 },
    banner: { w: 1600, h: 533 },     // Better banner
  };

  const dims = dimensionMap[usage] || { w: 2560, h: 1440 };
  const finalWidth = width || dims.w;
  const finalHeight = height || dims.h;

  const parts = [
    `professional website background: ${description}`,
    mood ? `mood: ${mood}` : null,
    colors ? `colors: ${colors}` : null,
    `high resolution, seamless, no text, no watermark, 8k quality, crisp details`,
  ].filter(Boolean);

  const prompt = parts.join(", ");
  // Use flux-realism for better background quality
  const opts = {
    width: finalWidth,
    height: finalHeight,
    model: "flux-realism",
    enhance: true,
  };
  const url = buildUrl(prompt, opts);
  return await formatResult(url, prompt, { ...opts, quality: "ultra" });
}

async function handleGenerateVariants(args) {
  if (!args?.prompt || typeof args.prompt !== "string" || args.prompt.trim().length === 0) {
    throw new Error("Prompt is required and must be a non-empty string");
  }
  const { prompt, count = 3, width = 1024, height = 1024, model = "flux" } = args;
  const finalCount = Math.min(Math.max(count, 2), 5);

  const variants = [];
  for (let i = 0; i < finalCount; i++) {
    const seed = Math.floor(Math.random() * 999999);
    const url = buildUrl(prompt, { width, height, model, seed });
    variants.push({ seed, url });
  }

  const lines = [
    `✅ ${finalCount} variants generated!`,
    ``,
    `📋 Prompt: ${prompt}`,
    `📐 Size: ${width}x${height}`,
    ``,
    ...variants.map(
      (v, i) => `🖼️  Variant ${i + 1} (seed: ${v.seed}):\n${v.url}`
    ),
    ``,
    `💡 Save a seed you like — same seed always gives the same image.`,
  ];

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

async function handleDownloadImage(args) {
  const { url, filename = "image" } = args;

  if (!url || typeof url !== "string") {
    throw new Error("url is required and must be a string");
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  try {
    // Download to local images folder
    const local = await downloadToLocal(url, filename);

    return {
      content: [
        {
          type: "text",
          text: [
            `✅ Image downloaded successfully!`,
            ``,
            `📁 Saved to: ${local.filepath}`,
            `📊 Size: ${local.size} bytes`,
            `🖼️  MIME: ${local.mimeType}`,
            ``,
            `� Also available at:`,
            url,
          ].join("\n"),
        },
      ],
    };
  } catch (err) {
    return { content: [{ type: "text", text: `❌ Error: ${err.message}` }] };
  }
}

// ─── Server Setup ────────────────────────────────────────────────────────────

const server = new Server(
  { name: "pollinations-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "generate_image":
      return await handleGenerateImage(args);
    case "generate_logo":
      return await handleGenerateLogo(args);
    case "generate_background":
      return await handleGenerateBackground(args);
    case "generate_variants":
      return await handleGenerateVariants(args);
    case "download_image":
      return await handleDownloadImage(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
