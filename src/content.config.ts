import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 博客文章集合：src/content/blog/*.md
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string().default('技术'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// 项目集合：src/content/projects/*.md
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // 项目周期，如 "2017.10 – 2017.12"
    period: z.string().optional(),
    date: z.coerce.date(),
    cover: z.string().optional(),
    github: z.string().url().optional(),
    demo: z.string().url().optional(),
    video: z.string().url().optional(),
    category: z.string().default('Projects'),
    tags: z.array(z.string()).default([]),
    // 首页"精选项目"展示
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, projects };
