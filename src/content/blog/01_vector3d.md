---
title: '图形学基础：3D 向量'
description: '3D 向量的定义、基本运算、点积、叉积'
pubDate: 2026-09-25
category: '图形学'
tags: ['图形学', '线性代数', '向量']
---

这是我「图形学基础」系列的第一篇。这个系列整理自我复习和学习计算机图形学时积累的笔记——一方面方便自己日后回看，另一方面也希望能在你入门时帮上一点忙。

> 3D 向量是计算机图形学里最基础的数学对象：**位置、方向、法线、速度、颜色 (RGB)**，底层全是它。
> 本篇聚焦向量本身：是什么、怎么算，以及图形学中出镜率最高的两种乘法——**点积**与**叉积**。

---

## 目录

- [一、定义](#一定义)
  - [1.1 数学定义](#11-数学定义)
  - [1.2 几何意义：方向 + 大小](#12-几何意义方向--大小)
  - [1.3 向量 vs 点](#13-向量-vs-点的区别)
  - [1.4 代码表示：Vec3f / Vec3d](#14-代码表示vec3f--vec3d)
- [二、基本运算](#二基本运算)
  - [2.1 加法 / 减法](#21-加法--减法)
  - [2.2 标量乘 / 标量除](#22-标量乘--标量除)
  - [2.3 模长（长度）](#23-模长长度)
  - [2.4 归一化（单位化）](#24-归一化单位化)
- [三、点积 (Dot Product)](#三点积-dot-product)
  - [3.1 代数定义](#31-代数定义)
  - [3.2 几何定义](#32-几何定义)
  - [3.3 几何意义：夹角、投影、判向](#33-几何意义夹角投影判向)
  - [3.4 派生 API：angleBetween / projectOnto / reflect](#34-派生-apianglebetween--projectonto--reflect)
  - [3.5 应用：光照 Lambert、背面剔除、投影](#35-应用光照-lambert背面剔除投影)
- [四、叉积 (Cross Product)](#四叉积-cross-product)
  - [4.1 定义](#41-定义)
  - [4.2 右手定则](#42-右手定则)
  - [4.3 模长 = 平行四边形面积](#43-模长--平行四边形面积)
  - [4.4 几何意义：法向量、面积、左右手系判定](#44-几何意义法向量面积左右手系判定)
  - [4.5 应用：求平面法线、三角形面积、点在三角形内外判定](#45-应用求平面法线三角形面积点在三角形内外判定)
- [五、面试速记](#五面试速记)

---

## 一、定义

### 1.1 数学定义

一个三维向量，就是**按固定顺序排列的三个实数**：

$$
\vec{v} = (v_x,\ v_y,\ v_z),\quad v_x,v_y,v_z \in \mathbb{R}
$$

顺序很重要：$(1, 2, 3)$ 和 $(3, 2, 1)$ 是两个完全不同的向量。这三个数也叫向量的**分量**（component），下标 $x/y/z$ 对应三个坐标轴。图形学里通常采用**右手坐标系**（$+x$ 向右、$+y$ 向上、$+z$ 朝屏幕外；不同引擎约定可能不同，本文统一按右手系讨论）。

### 1.2 几何意义：方向 + 大小

去掉具体的数字，向量在几何上就是一支「箭头」：

> **向量 = 方向 + 大小（长度）**

- **方向**：箭头从尾指向头的朝向；
- **大小（模长）**：箭头有多长。

一个很容易被忽略的关键性质：向量**与起点无关**。把一支箭头在空间里随便平移，它还是原来那个向量——因为它描述的是「位移」而不是「位置」。这也是为什么后面讲「两点相减得向量」时，结果可以画在任何地方。

### 1.3 向量 vs 点的区别

向量和点在数学上都写成 $(x,y,z)$，但语义完全不同，工程上必须分清：

| | 点 (Point) | 向量 (Vector) |
|---|---|---|
| 语义 | 空间中的**位置** | **方向 + 长度**（位移） |
| 平移改变? | **是**（平移后位置变了） | **否**（平移后仍是同一向量） |
| 合法运算 | 点 + 向量 = 新点；点 − 点 = 向量 | 向量 ± 向量 = 向量 |
| 典型用途 | 顶点坐标、相机位置、光源位置 | 方向、法线、速度、颜色(rgb) |

> 口诀：**「两点相减得向量，点加向量得新点。」**
> 到讲齐次坐标与矩阵变换的篇章，我们会给点写成 $(x,y,z,1)$、向量写成 $(x,y,z,0)$，用第 4 个分量从数学上把二者彻底区分开。

### 1.4 代码表示：Vec3f / Vec3d

一个典型的向量类用模板结构体 `Vec3<T>` 实现，并提供两个常用别名：

```cpp
struct Vec3 {
    float x, y, z;
};

using Vec3f = Vec3<float>;
using Vec3d = Vec3<double>;

int main() {
    using namespace gm;

    // 类型别名：Vec3f = Vec3<float>，Vec3d = Vec3<double>
    Vec3f a(1.0f, 2.0f, 3.0f);   // 三元构造 (x, y, z)
    Vec3f b;                      // 默认构造，零向量 (0,0,0)

    // 成员访问
    std::cout << a.x << " " << a.y << " " << a.z << "\n";

    // 数组式访问（便于循环）：operator[]
    for (int i = 0; i < 3; ++i) {
        std::cout << a[i] << " "; // 等价于 a.x / a.y / a.z
    }

    // 流输出：operator<<，打印成 "(1, 2, 3)"
    std::cout << a << "\n";
}
```

要点：

- 成员直存三个分量 `x / y / z`，另有 `Vec3f`（float）/ `Vec3d`（double）两个常用别名；
- 构造：默认零向量、`Vec3(x,y,z)`；
- `operator[](int)` 数组式访问；
- `operator<<` 流打印。

---

## 二、基本运算

### 2.1 加法 / 减法

两个向量逐分量相加 / 相减：

$$
\vec{a} \pm \vec{b} = (a_x \pm b_x,\ a_y \pm b_y,\ a_z \pm b_z)
$$

**几何意义**（三角形法则 / 平行四边形法则）：
- **加法**：先沿 $\vec{a}$ 走，再沿 $\vec{b}$ 走，从起点指向终点的箭头就是 $\vec{a}+\vec{b}$（所以加法满足交换律：先走哪段都一样）；
- **减法**：$\vec{a}-\vec{b}$ 是从 $\vec{b}$ 的终点指向 $\vec{a}$ 的终点的箭头——注意方向，减出来的向量指向「被减数」那一侧。

```cpp
gm::Vec3f a(1, 2, 3), b(4, 5, 6);
gm::Vec3f sum  = a + b;   // (5, 7, 9)
gm::Vec3f diff = a - b;   // (-3, -3, -3)
gm::Vec3f neg  = -a;      // (-1, -2, -3) 取负（反向）
a += b;                   // 复合赋值 (5, 7, 9)
```

> **由两点求方向**：若 `P0`、`P1` 是两个位置点，则从 `P0` 指向 `P1` 的方向就是 `P1 - P0`（终点减起点）。这是图形学里最常用的操作之一，比如「从相机指向物体的视线方向」就是这么算的。

### 2.2 标量乘 / 标量除

向量与标量逐分量相乘 / 相除：

$$
k\vec{a} = (k a_x,\ k a_y,\ k a_z)
$$

**几何意义**：对向量做**缩放**——方向不变，长度变为原来的 $|k|$ 倍。$k>0$ 同向放大缩小，$k<0$ 反向，$k=0$ 得到零向量。

```cpp
gm::Vec3f a(1, 2, 3);
gm::Vec3f d1 = a * 2.0f;   // (2, 4, 6)   向量 * 标量
gm::Vec3f d2 = 2.0f * a;   // (2, 4, 6)   标量 * 向量（左乘，满足交换律）
gm::Vec3f d3 = a / 2.0f;   // (0.5, 1, 1.5)
a *= 2.0f;                 // 复合赋值
```

实现上很简单：成员 `operator*` / `operator/`，外加一个自由函数 `operator*(T s, const Vec3<T>& v)` 支持标量左乘。

### 2.3 模长（长度）

模长（$\ell_2$ 范数）就是各分量平方和再开方——本质是勾股定理在三维的推广：

$$
\|\vec{v}\| = \sqrt{v_x^2 + v_y^2 + v_z^2}
$$

```cpp
gm::Vec3f v(3, 4, 0);
float len = v.length();          // 5    sqrt(9+16+0) = 5
float len2 = v.lengthSquared();  // 25   长度的平方，免开方
bool  zero = v.isZero();         // false 是否近似零向量
```

**性能提示**：`sqrt` 相对较慢。如果只是要**比较长度**（比如「距离是否小于某个阈值」），直接比较平方值就够了，把开方省下来：

```cpp
// 判断两点 P1, P2 距离是否 < r，用平方避免开方
float r2 = r * r;
bool near = (P1 - P2).lengthSquared() < r2;   // ✅ 推荐
// bool near = (P1 - P2).length() < r;        // ❌ 多一次开方
```

典型实现提供三个接口：`lengthSquared()`、`length()`、`isZero(eps)`。

### 2.4 归一化（单位化）

**单位向量**是长度为 1 的向量。把任意非零向量除以自己的模长，就得到同方向的单位向量：

$$
\hat{v} = \frac{\vec{v}}{\|\vec{v}\|}
$$

**几何意义**：把「大小」信息剥掉，只留「纯方向」。图形学中绝大多数方向（法线、光线方向、视线方向、反射方向）都约定用**单位向量**表示——这样点积就能直接给出 $\cos\theta$，公式最简洁（见 3.3 节）。

```cpp
gm::Vec3f v(3, 4, 0);
gm::Vec3f n = v.normalized();   // (0.6, 0.8, 0)，长度 = 1
// 零向量没有方向，无法归一化：normalized() 对零向量返回零向量（避免除零）
gm::Vec3f z;
gm::Vec3f zn = z.normalized();  // (0,0,0)
```

`normalized()` 的典型实现：先取 `length()`，若长度接近 0 则返回零向量（防止除以 0）。

---

## 三、点积 (Dot Product)

点积（又称内积 / scalar product）是图形学里**出场率最高**的运算，结果是**标量**。记号 $\vec{a}\cdot\vec{b}$ 或 $\langle \vec{a},\vec{b}\rangle$。

### 3.1 代数定义

逐分量相乘再求和：

$$
\vec{a}\cdot\vec{b} = a_x b_x + a_y b_y + a_z b_z
$$

```cpp
gm::Vec3f a(1, 2, 3), b(4, 5, 6);
float d = gm::dot(a, b);   // 1*4 + 2*5 + 3*6 = 32
```

### 3.2 几何定义

$$
\vec{a}\cdot\vec{b} = \|\vec{a}\|\,\|\vec{b}\|\cos\theta
$$

其中 $\theta \in [0,\pi]$ 是 $\vec{a}$、$\vec{b}$ 的夹角。

**为什么代数定义和几何定义是等价的？** 推导要点：
设 $\hat{e}_x,\hat{e}_y,\hat{e}_z$ 是标准正交基，则 $\vec{a}=\sum a_i\hat{e}_i$，$\vec{b}=\sum b_i\hat{e}_i$。由内积的双线性与正交基的 $\hat{e}_i\cdot\hat{e}_j=\delta_{ij}$，得：

$$
\vec{a}\cdot\vec{b} = \sum_i\sum_j a_i b_j (\hat{e}_i\cdot\hat{e}_j) = \sum_i a_i b_i
$$

再令 $\vec{c}=\vec{a}-\vec{b}$，由 $\vec{c}\cdot\vec{c}=\|\vec{c}\|^2$ 展开可解出 $\vec{a}\cdot\vec{b}=\|\vec{a}\|\|\vec{b}\|\cos\theta$（本质是余弦定理）。两种定义由此打通。

### 3.3 几何意义：夹角、投影、判向

由几何定义可以推出三条核心性质，图形学里到处都在用：

**① 夹角（求 $\cos\theta$）**

$$
\cos\theta = \frac{\vec{a}\cdot\vec{b}}{\|\vec{a}\|\,\|\vec{b}\|}
$$

当 $\vec{a},\vec{b}$ 都是单位向量时，$\cos\theta = \vec{a}\cdot\vec{b}$，一个点积直接就是夹角余弦——这就是「方向一律用单位向量」约定的回报。

**② 投影长度**

$\vec{a}$ 在单位向量 $\hat{b}$ 方向上的**投影长度（标量）**：

$$
\text{proj\_len} = \vec{a}\cdot\hat{b}
$$

若 $\vec{b}$ 非单位，则投影长度 $= \dfrac{\vec{a}\cdot\vec{b}}{\|\vec{b}\|}$。

**③ 正负判断方向关系**（重点）

| 点积值 | 夹角 $\theta$ | 关系 | 图形学应用 |
|:---:|:---:|:---|:---|
| $> 0$ | $\theta < 90°$ | 同向 / 大致同侧 | 表面朝向光源 / 视点，可见 |
| $= 0$ | $\theta = 90°$ | **垂直（正交）** | 法线 ⊥ 切线；$\vec{a}\cdot\vec{b}=0 \iff \vec{a}\perp\vec{b}$ |
| $< 0$ | $\theta > 90°$ | 反向 / 大致异侧 | 背对光源 / 视点，背面 |

> 背面剔除、光照强度、可见性判断，底层其实是同一件事：**看一个点积的正负号**。

### 3.4 派生 API：angleBetween / projectOnto / reflect

在 `dot` 基础上通常还会封装三个常用函数：

**(1) `gm::angleBetween(a, b)` —— 两向量夹角（弧度，$[0,\pi]$）**

$$
\theta = \arccos\!\left(\mathrm{clamp}\!\left(\frac{\vec{a}\cdot\vec{b}}{\|\vec{a}\|\,\|\vec{b}\|},\,-1,\,1\right)\right)
$$

```cpp
using namespace gm;
float rad = angleBetween(Vec3f(1,0,0), Vec3f(1,1,0));   // ≈ 0.7854 弧度
float deg = rad * 180.0f / 3.14159265f;                  // ≈ 45°
```

> 实现细节：先用点积除以模长积求 $\cos\theta$，再 `clamp` 到 $[-1,1]$——浮点误差可能让本应是 1 的值变成 1.0000001，直接喂给 `acos` 会得到 NaN，最后才 `std::acos`。

**(2) `gm::projectOnto(a, b)` —— $\vec{a}$ 在 $\vec{b}$ 方向上的投影向量（含方向）**

投影长度乘上 $\vec{b}$ 的单位方向，就是投影向量：

$$
\mathrm{proj}_{\vec{b}}\vec{a} = \left(\frac{\vec{a}\cdot\vec{b}}{\vec{b}\cdot\vec{b}}\right)\vec{b}
$$

（分母 $\vec{b}\cdot\vec{b}=\|\vec{b}\|^2$，这样写避免了显式开方。）

```cpp
using namespace gm;
// 把 (1,1,0) 投影到 x 轴方向 (1,0,0) 上
Vec3f p = projectOnto(Vec3f(1,1,0), Vec3f(1,0,0));  // (1,0,0)
```

**(3) `gm::reflect(v, n)` —— 镜面反射向量**

入射方向 $\vec{v}$ 撞上单位法线 $\hat{n}$ 后弹开的方向（经典公式）：

$$
\vec{r} = \vec{v} - 2(\vec{v}\cdot\hat{n})\,\hat{n}
$$

> 推导思路：把 $\vec{v}$ 分解成「平行于法线的分量」$\vec{v}_\parallel=(\vec{v}\cdot\hat{n})\hat{n}$ 和「垂直分量」$\vec{v}_\perp$。反射时垂直分量原样保留，平行分量反向：$\vec{r}=\vec{v}_\perp-\vec{v}_\parallel=\vec{v}-2\vec{v}_\parallel$。就像乒乓球撞桌面：水平速度不变，垂直速度反向。

```cpp
using namespace gm;
// 方向 (1,-1,0) 撞水平地面（法线 (0,1,0)），应反射成 (1,1,0)
Vec3f r = reflect(Vec3f(1,-1,0), Vec3f(0,1,0));  // (1,1,0)
```

### 3.5 应用：光照 Lambert、背面剔除、投影

**① 光照 —— Lambert 漫反射**

漫反射强度与「法线 × 光线方向」的点积成正比（`max` 用来防止「负光」）：

$$
I = I_{\max}\cdot\max(0,\ \hat{n}\cdot\hat{L})
$$

其中 $\hat{n}$ 是表面单位法线，$\hat{L}$ 是从表面指向光源的单位方向。直觉很好理解：光正对着表面打过来（$\hat{n}\cdot\hat{L}=1$）最亮；越斜越暗；光从背面打来（$\hat{n}\cdot\hat{L}<0$）强度截断为 0。

```cpp
// n: 表面法线（单位）, L: 指向光源（单位）, baseColor: 漫反射颜色
float diff = std::max(0.0f, gm::dot(n, L));
gm::Vec3f color = baseColor * lightColor * diff;
```

**② 背面剔除 (Back-face Culling)**

一个三角面要么朝向相机，要么背对相机；背对的那面永远看不见，直接不画。设视方向 $\vec{v}$（从三角形指向相机），面法线 $\hat{n}$：

- $\hat{n}\cdot\vec{v} > 0$ → 正面朝相机，**渲染**；
- $\hat{n}\cdot\vec{v} < 0$ → 背面，**剔除**（不画）。

```cpp
if (gm::dot(normal, viewDir) < 0.0f) {
    // 背面，剔除
    return;
}
```

**③ 投影 / 分量分解**

把一个向量分解到任意方向：比如把速度投影到斜面方向求「下滑分量」；或求点到直线的距离（用 $\vec{v}-\mathrm{proj}$ 得到垂直分量）。`projectOnto` 直接给出投影向量。

---

## 四、叉积 (Cross Product)

叉积（又称外积 / vector product）只对三维向量有定义，结果是**向量**，方向**同时垂直于两个输入向量**。记号 $\vec{a}\times\vec{b}$。

### 4.1 定义

$$
\vec{a}\times\vec{b} =
\begin{vmatrix}
\hat{i} & \hat{j} & \hat{k} \\
a_x & a_y & a_z \\
b_x & b_y & b_z
\end{vmatrix}
= (a_y b_z - a_z b_y,\quad a_z b_x - a_x b_z,\quad a_x b_y - a_y b_x)
$$

```cpp
gm::Vec3f c = gm::cross(gm::Vec3f(1,0,0),   // x 轴
                         gm::Vec3f(0,1,0));  // y 轴
// c == (0,0,1)  →  x × y = z（右手系）
```

**重要性质**：叉积**不满足交换律**，满足**反交换律**——交换顺序结果反向：

$$
\vec{a}\times\vec{b} = -(\vec{b}\times\vec{a})
$$

因此 $\vec{a}\times\vec{a}=\vec{0}$（任何向量与自身叉积为零向量）。

### 4.2 右手定则

叉积结果朝哪边？**右手定则**给出答案（按右手坐标系讨论）：

1. 伸出右手，四指从 $\vec{a}$ 的方向**以不超过 180° 的角度**弯向 $\vec{b}$ 的方向；
2. 大拇指所指的方向，就是 $\vec{a}\times\vec{b}$ 的方向。

记忆口诀（标准基的循环）：

$$
\hat{i}\times\hat{j}=\hat{k},\quad \hat{j}\times\hat{k}=\hat{i},\quad \hat{k}\times\hat{i}=\hat{j}
$$

> 反过来 $\hat{j}\times\hat{i}=-\hat{k}$。这也是判断「左 / 右手系」的试金石：若 $\hat{x}\times\hat{y}=+\hat{z}$ 则是右手系。

### 4.3 模长 = 平行四边形面积

由几何定义 $\vec{a}\times\vec{b}=\|\vec{a}\|\|\vec{b}\|\sin\theta\,\hat{n}$ 可得模长：

$$
\|\vec{a}\times\vec{b}\| = \|\vec{a}\|\,\|\vec{b}\|\sin\theta
$$

这恰好等于以 $\vec{a},\vec{b}$ 为**邻边的平行四边形面积**：底为 $\|\vec{a}\|$，高为 $\|\vec{b}\|\sin\theta$（斜边在垂直方向上的投影）。

```cpp
using namespace gm;
// 邻边长 2 和 3 的矩形，面积 = 6
float area = cross(Vec3f(2,0,0), Vec3f(0,3,0)).length();  // 6
```

两个实用推论：
- **三角形面积**（以 $\vec{a},\vec{b}$ 为两边）$= \dfrac{1}{2}\|\vec{a}\times\vec{b}\|$（三角形是平行四边形的一半）；
- $\vec{a}\parallel\vec{b} \iff \vec{a}\times\vec{b}=\vec{0}$（共线判定，$\sin\theta=0$）。

### 4.4 几何意义：法向量、面积、左右手系判定

| 性质 | 说明 | 应用 |
|---|---|---|
| **方向** | 结果垂直于 $\vec{a}$ 和 $\vec{b}$ 所在平面，由右手定则定向 | 求平面 / 三角形的法线 |
| **模长** | $=\|\vec{a}\|\|\vec{b}\|\sin\theta$，平行四边形面积 | 求面积、判定共线 |
| **判左右（2D）** | 在 $xy$ 平面，$\vec{a}\times\vec{b}$ 的 $z$ 分量正负表示 $\vec{b}$ 在 $\vec{a}$ 的左 / 右侧 | 点在多边形内外、凸包 |

**左右判定**（2D 推广）：令 $\vec{a},\vec{b}$ 的 $z=0$，则 $\vec{a}\times\vec{b}=(0,0,\,a_x b_y-a_y b_x)$，只剩 $z$ 分量有信息：
- $z$ 分量 $>0$ → $\vec{b}$ 在 $\vec{a}$ 的**左侧**（从 $\vec{a}$ 逆时针转到 $\vec{b}$）；
- $z$ 分量 $<0$ → $\vec{b}$ 在 $\vec{a}$ 的**右侧**（顺时针）；
- $z$ 分量 $=0$ → 共线。

### 4.5 应用：求平面法线、三角形面积、点在三角形内外判定

**① 求平面 / 三角形法线**

给定三角形三顶点 $V_0,V_1,V_2$，任取两条边向量做叉积，就得到垂直于三角形所在平面的法线，再归一化：

$$
\hat{n} = \mathrm{normalize}\big((V_1-V_0)\times(V_2-V_0)\big)
$$

```cpp
using namespace gm;
Vec3f v0(0,0,0), v1(1,0,0), v2(0,1,0);
Vec3f edge1 = v1 - v0;            // (1,0,0)
Vec3f edge2 = v2 - v0;            // (0,1,0)
Vec3f normal = cross(edge1, edge2).normalized();  // (0,0,1)
```

> 注意：法线朝向由**顶点绕序**（$V_0\to V_1\to V_2$）与叉积顺序共同决定，绕序一反法线就反向。图形学里「正 / 反面」「逆时针 / 顺时针」的约定正来源于此。

**② 三角形面积**

$$
S_{\triangle} = \tfrac{1}{2}\,\big\|(V_1-V_0)\times(V_2-V_0)\big\|
$$

```cpp
float S = 0.5f * cross(v1 - v0, v2 - v0).length();
```

**③ 点在三角形内外判定（叉乘同号法）**

设点 $P$ 与三角形 $V_0V_1V_2$ 共面。让 $P$ 分别与三条边做叉积：

$$
c_0=(V_1-V_0)\times(P-V_0),\ c_1=(V_2-V_1)\times(P-V_1),\ c_2=(V_0-V_2)\times(P-V_2)
$$

直觉：$P$ 在三角形内 ⟺ 它在三条边的**同一侧**：

- $c_0,c_1,c_2$ 与三角形法线 $\hat{n}$ 的点积**同号**（全正或全负）→ **点在三角形内**；
- 出现异号 → 点在三角形外；
- 出现 0 → 点恰好落在边上。

> 「点在三角形内还是外」是光栅化与射线求交中的经典问题，本节的同号法与后续篇章的重心坐标法是两种主流解法，这里先作为点积与叉积的综合应用埋个伏笔。

---

## 五、面试速记

### 核心公式速查

| 运算 | 公式 | 结果类型 | 几何意义 |
|---|---|:---:|---|
| 模长 | $\|\vec{v}\|=\sqrt{v_x^2+v_y^2+v_z^2}$ | 标量 | 长度 |
| 归一化 | $\hat{v}=\vec{v}/\|\vec{v}\|$ | 向量 | 纯方向（长度 1） |
| **点积** | $\vec{a}\cdot\vec{b}=\|\vec{a}\|\|\vec{b}\|\cos\theta$ | **标量** | 夹角 / 投影 / 判同向反向 |
| **叉积** | $\|\vec{a}\times\vec{b}\|=\|\vec{a}\|\|\vec{b}\|\sin\theta$ | **向量** | 法线 / 面积 / 判左右 |

### 点积 vs 叉积（必背对比）

| | 点积 (Dot) | 叉积 (Cross) |
|---|---|---|
| 结果 | **标量** | **向量** |
| 公式 | $a_xb_x+a_yb_y+a_zb_z$ | 行列式展开 |
| 几何 | $\|\vec{a}\|\|\vec{b}\|\cos\theta$ | $\|\vec{a}\|\|\vec{b}\|\sin\theta\,\hat{n}$ |
| 交换律 | 满足 $\vec{a}\cdot\vec{b}=\vec{b}\cdot\vec{a}$ | **反交换** $\vec{a}\times\vec{b}=-\vec{b}\times\vec{a}$ |
| 平行 | $\vec{a}\cdot\vec{b}=\pm\|\vec{a}\|\|\vec{b}\|$ | $=\vec{0}$ |
| 垂直 | $=0$ | $\|\cdot\|=\|\vec{a}\|\|\vec{b}\|$（最大） |
| 用途 | 夹角、投影、光照、背面剔除 | 法线、面积、左右 / 内外判定 |

### 必记口诀

- **向量 = 方向 + 大小**，平移不变；**点 = 位置**，平移会变。两点相减得向量。
- **方向一律用单位向量** → 点积直接 = $\cos\theta$，公式最简。
- **比较长度用平方**：`lengthSquared()` 省开方。
- **点积看正负**：$>0$ 同向、$=0$ 垂直、$<0$ 反向 → 一切可见性 / 光照的判据。
- **叉积得法线**：右手定则定方向，模长 = 平行四边形面积，三角形面积再 ×0.5。
- **反射公式** $\vec{r}=\vec{v}-2(\vec{v}\cdot\hat{n})\hat{n}$；**投影向量** $=\dfrac{\vec{a}\cdot\vec{b}}{\vec{b}\cdot\vec{b}}\vec{b}$。

### 本文 API 速查（命名空间 `gm`）

| API | 作用 |
|---|---|
| `Vec3f` / `Vec3d` | float / double 三维向量类型别名 |
| `a + b`, `a - b`, `-a`, `a * s`, `s * a`, `a / s` | 加减 / 取负 / 标量乘除 |
| `a.length()`, `a.lengthSquared()` | 模长 / 模长平方（免开方） |
| `a.normalized()` | 归一化（零向量返回零向量） |
| `a.isZero()` | 是否近似零向量 |
| `gm::dot(a, b)` | 点积 |
| `gm::cross(a, b)` | 叉积 |
| `gm::angleBetween(a, b)` | 夹角（弧度，$[0,\pi]$） |
| `gm::projectOnto(a, b)` | $\vec{a}$ 在 $\vec{b}$ 上的投影向量 |
| `gm::reflect(v, n)` | 反射向量（$\vec{n}$ 须为单位向量） |

---
