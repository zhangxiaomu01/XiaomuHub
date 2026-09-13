---
title: 'Underwater Rendering（水下渲染）'
description: '技术 Demo：用 C++/OpenGL/GLSL 呈现生动美丽的浅海景观，练习光照与着色技术。'
date: 2017-12-01
period: '2017.10 – 2017.12'
category: '游戏与互动媒体'
tags: ['C++', 'OpenGL', 'GLSL', '渲染']
github: 'https://github.com/zhangxiaomu01/CGT520FinalPro'
featured: true
---

"水下渲染"是一个技术 Demo，描绘了生动美丽的浅海景色。我想把学到的光照与着色技术结合起来，加上自己过去的美术功底，模拟一个生动的水下世界。

## 项目演示

<div class="video-wrapper"><iframe src="https://player.vimeo.com/video/248075082" title="Underwater Rendering Demo" loading="lazy" allowfullscreen></iframe></div>
<p class="video-link">▶ 国内可能无法加载 Vimeo 播放器，<a href="https://vimeo.com/248075082" target="_blank" rel="noopener">点此在 Vimeo 观看原视频</a></p>

## 技术实现

代码使用 C++ 编写，应用了多个 OpenGL 特性：

- 多重采样（Multisampling）抗锯齿
- 纹理映射与切线空间法线贴图（Tangent Space Normal Mapping）
- 光照与深度贴图阴影（Depth Map Shadows）

我还编写了多个不同的着色器（GLSL）来区分场景中的不同物体：所有鱼类的动画都在着色器程序中完成，并用一个有趣的粒子容器来控制鱼群的行为。

## 相关链接

- 源码：[GitHub · CGT520FinalPro](https://github.com/zhangxiaomu01/CGT520FinalPro)
