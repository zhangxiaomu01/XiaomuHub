---
title: '用 Python 给 Maya 写工具是什么体验'
description: '从美术需求出发，用 Python 把重复劳动脚本化：批量改名、资产检查、导出流水线。'
pubDate: 2018-05-06
category: '技术'
tags: ['Python', 'Maya', '技术美术']
---

做 CryoVR 项目那段时间，我在 Maya 里整理了大量 CP30 设备的模型与贴图。纯手工操作太痛苦，于是用 Maya 的 Python API 写了一批小工具，这篇文章记录几个实用的经验。

## 最常写的三类工具

- **批量处理**：改名、分组、贴图路径重定向
- **资产检查**：命名规范校验、未赋材质的面检测
- **导出流水线**：一键导出 UE4 可用的 FBX，参数固化在脚本里

## 一段最常用的模板

```python
from maya import cmds

def batch_rename(pattern, replacement):
    for node in cmds.ls(selection=True, long=True):
        if pattern in node:
            new_name = node.replace(pattern, replacement)
            cmds.rename(node, new_name)
```

给选中的物体批量替换名字里的某段字符串，二十行不到，但每次能省半小时。

## 心得

工具的价值不在复杂，在于**把人从重复里解放出来**。先解决眼前最烦的那一步，写着写着需求自然会来找你。
