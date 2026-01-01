import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import partytown from "@astrojs/partytown";
import icon from "astro-icon";
import rehypeFigureTitle from "rehype-figure-title";
import { rehypeAccessibleEmojis } from "rehype-accessible-emojis";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { remarkModifiedTime } from "./src/plugins/remark-modified-time.mjs";

// https://astro.build/config
export default defineConfig({
    site: "https://example.com",
    integrations: [
        mdx(),
        sitemap(),
        icon(),
        partytown({
            config: {
                forward: ["dataLayer.push"],
            },
        }),
    ],
    vite: {
        plugins: [tailwindcss()],
    },
    markdown: {
        remarkPlugins: [remarkModifiedTime, remarkMath],
        rehypePlugins: [rehypeFigureTitle, rehypeAccessibleEmojis, rehypeKatex],
    },
});
