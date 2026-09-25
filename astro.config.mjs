// @ts-check
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config/
export default defineConfig({
  // TODO(阶段5): 域名备案后替换为正式域名，用于 RSS/sitemap 等绝对地址生成
  site: 'https://example.com',
  markdown: {
    // 数学公式渲染：$...$ / $$...$$ → KaTeX
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  image: {
    // 限制生成图片的最大宽度，控制 6M 带宽下的页面体积
    breakpoints: [640, 750, 828, 1080, 1280, 1668],
  },
});
