---
title: 'Planetary Landscape Generation（程序化行星地形生成）'
description: '个人项目：用 C++/OpenGL/GLSL 实现自适应 LOD 的程序化行星地形生成。'
date: 2018-12-01
period: '2018 秋'
category: '游戏与互动媒体'
tags: ['C++', 'OpenGL', 'GLSL', '程序化生成']
featured: true
---

一个个人项目，目标是生成一颗程序化生成的行星。Demo 使用 **C++/OpenGL/GLSL** 实现。

## 自适应 LOD

行星基础几何体采用了自适应细节层次（Level of Detail）算法，包含两个核心部分：

- **高层几何划分**：根据行星与相机之间的距离，对三角网格进行递归细分（Subdivide）或合并（Merge），在函数调用中递归实现
- **底层细分**：利用 OpenGL 的曲面细分（Tessellation）特性，把基础球面进一步划分为极小的子三角形，为地形提供高分辨率细节

两者结合，近处山脊清晰、远处轮廓完整，同时保持可接受的性能开销。

> 注：原演示动图（LOD 细分过程演示）体积较大，待压缩处理后补充。
