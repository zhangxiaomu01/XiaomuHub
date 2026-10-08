---
title: '图形学基础：四元数'
description: '四元数定义与运算、轴-角转换、旋转向量、SLERP 插值、与矩阵/欧拉角互转'
pubDate: 2026-10-07
category: '图形学'
tags: ['图形学', '线性代数', '四元数']
---

这是我「图形学基础」系列的第三篇。上一篇的 4×4 矩阵明明已经能表示旋转了，为什么图形学还要把哈密顿 1843 年发明的四元数请回来？因为**专门表示三维旋转，四元数几乎是全面更优的选择**：更省存储、没有万向节死锁、旋转合成只要一次乘法，还能做平滑的球面插值。

> **单位四元数是表示三维旋转的最优工具之一**：只用 4 个数、没有万向节死锁、合成简单（一次乘法）、插值平滑（SLERP 匀角速度）、数值稳定。
> 本篇聚焦：四元数是什么、怎么算、怎么用 $v'=qvq^{-1}$ 旋转向量、怎么插值，以及与旋转矩阵 / 欧拉角之间如何互转。

「四元数」这名字听着玄——复数的四维推广？别慌，上一篇的点积和叉积已经把门票买好了：四元数乘法拆开看，就是点积和叉积的二人转。

---

## 目录

- [一、四元数是什么](#一四元数是什么)
  - [1.1 从复数说起](#11-从复数说起)
  - [1.2 虚部单位的乘法规则](#12-虚部单位的乘法规则)
  - [1.3 存储排列约定：w 在最后](#13-存储排列约定w-在最后)
  - [1.4 代码表示：Quatf / Quatd](#14-代码表示quatf--quatd)
- [二、基本运算](#二基本运算)
  - [2.1 加减 / 数乘](#21-加减--数乘)
  - [2.2 四元数乘法（Grassmann 积）](#22-四元数乘法grassmann-积)
  - [2.3 共轭 conjugate()](#23-共轭-conjugate)
  - [2.4 模长 norm()](#24-模长-norm)
  - [2.5 逆 inverse()](#25-逆-inverse)
  - [2.6 归一化 normalized()](#26-归一化-normalized)
- [三、旋转四元数：轴-角 ↔ 四元数](#三旋转四元数轴角--四元数)
  - [3.1 半角的秘密：单位四元数表示旋转](#31-半角的秘密单位四元数表示旋转)
  - [3.2 双覆盖：一个旋转，两个四元数](#32-双覆盖一个旋转两个四元数)
  - [3.3 fromAxisAngle：从轴-角到四元数](#33-fromaxisangle从轴角到四元数)
  - [3.4 toAxisAngle：从四元数回到轴-角](#34-toaxisangle从四元数回到轴角)
  - [3.5 旋转的合成](#35-旋转的合成)
- [四、用四元数旋转向量](#四用四元数旋转向量)
  - [4.1 公式：把向量夹在中间](#41-公式把向量夹在中间)
  - [4.2 推导：结果正是 Rodrigues 旋转公式](#42-推导结果正是-rodrigues-旋转公式)
  - [4.3 rotateVector 的典型实现](#43-rotatevector-的典型实现)
- [五、四元数插值：LERP / NLERP / SLERP](#五四元数插值lerp--nlerp--slerp)
  - [5.1 LERP：最便宜，但角速度不均匀](#51-lerp最便宜但角速度不均匀)
  - [5.2 NLERP：拉回单位球面](#52-nlerp拉回单位球面)
  - [5.3 SLERP：沿大圆弧匀角速度](#53-slerp沿大圆弧匀角速度)
  - [5.4 slerp 实现与三种方法对比](#54-slerp-实现与三种方法对比)
- [六、四元数 vs 欧拉角：万向节死锁](#六四元数-vs-欧拉角万向节死锁)
  - [6.1 欧拉角：直观，但有坑](#61-欧拉角直观但有坑)
  - [6.2 万向节死锁：丢掉的那个自由度](#62-万向节死锁丢掉的那个自由度)
  - [6.3 四元数赢在哪](#63-四元数赢在哪)
  - [6.4 三种旋转表示对比](#64-三种旋转表示对比)
- [七、四元数 ↔ 旋转矩阵](#七四元数--旋转矩阵)
  - [7.1 toMatrix：四元数转矩阵](#71-tomatrix四元数转矩阵)
  - [7.2 fromMatrix：Shepperd 分支法](#72-frommatrixshepperd-分支法)
  - [7.3 互转的应用链](#73-互转的应用链)
- [八、面试速记](#八面试速记)

---

## 一、四元数是什么

### 1.1 从复数说起

第一步，先把复数看成二维平面上的点：$z = a + bi$ 就对应坐标 $(a,\ b)$——实部 $a$ 当 $x$，虚部 $b$ 当 $y$。这张平面叫**复平面**，$1$ 和 $i$ 就是它的两个「基底」，满足 $i^2 = -1$。

第二步，看看「乘 $i$」会发生什么：

$$
i\,(a + bi) = -b + ai \quad\Longleftrightarrow\quad (a,\ b)\ \to\ (-b,\ a)
$$

拿 $(1, 0)$ 试一下：乘 $i$ 得 $(0, 1)$，$x$ 轴正方向被转到了 $y$ 轴正方向——**乘 $i$，就是绕原点逆时针转 90°**。原来复数乘法偷偷藏着「旋转」的身份。

第三步，推广到任意角度。把「转 $\theta$」对应的乘数记作 $e^{i\theta}$，欧拉公式给出它的坐标：

$$
e^{i\theta} = \cos\theta + i\sin\theta
$$

即复平面上单位圆、与 $x$ 轴夹角 $\theta$ 的那个点。任取一个复数 $z = r(\cos\phi + i\sin\phi)$（模长 $r$、辐角 $\phi$），乘上它：

$$
e^{i\theta}\,z = (\cos\theta + i\sin\theta)\cdot r(\cos\phi + i\sin\phi) = r\bigl(\cos(\theta+\phi) + i\sin(\theta+\phi)\bigr)
$$

（展开后套两角和公式即可验证。）结果：**模长 $r$ 原封不动，辐角 $\phi \to \phi+\theta$**——模不变、角度加 $\theta$，正是「绕原点旋转 $\theta$」的定义。乘 $i$ 转 90°、乘 $-1$ 转 180°，都只是它的特例。

> **复数天生就是二维旋转的表示**：想转多少度，乘上对应的 $e^{i\theta}$ 就行。

哈密顿（W. R. Hamilton）想把这套路数推广到三维：能不能找到一种「数」，乘一下就完成三维旋转？1843 年，相传他在都柏林的布鲁姆桥上灵光乍现，把核心公式刻在了桥上：

$$
i^2 = j^2 = k^2 = ijk = -1
$$

答案就是**四元数 (Quaternion)**：在 $\{1,\,i\}$ 的基础上再添两个虚部单位 $j$、$k$，凑齐四个实基底：

$$
q = w + x\,i + y\,j + z\,k,\qquad w,x,y,z \in \mathbb{R}
$$

图形学资料里通行 **Hamilton 约定**（最经典、资料最多，本文也用它），并习惯把四元数拆成「标量 + 向量」两部分：

- $w$ 是**标量（实）部分**；
- $(x,y,z)$ 是**向量（虚）部分**，记 $\vec{v}=(x,y,z)$。

于是常简记为

$$
q = (w,\ \vec{v}) \quad\text{或}\quad q = w + \vec{v}
$$

### 1.2 虚部单位的乘法规则

由 $i^2=j^2=k^2=ijk=-1$ 可以推出**循环乘法**：

$$
ij = k,\quad jk = i,\quad ki = j
$$

以及**反序取负**：

$$
ji = -k,\quad kj = -i,\quad ik = -j
$$

> 记忆口诀：顺着 $i\to j\to k\to i$ 乘是正的，逆着乘加个负号——和上一篇叉积的循环 $\hat{i}\times\hat{j}=\hat{k}$ 一模一样。也正因为 $ij\neq ji$，四元数乘法**天生不可交换**，后面所有「先谁后谁」的讲究都源于此。

### 1.3 存储排列约定：w 在最后

数学上四元数写作 $q=w+xi+yj+zk$（$w$ 打头），但**内存里通常按 $(x, y, z, w)$ 排列**——本文的代码约定也是如此：

```cpp
template <typename T>
struct Quaternion {
    T x, y, z, w;   // (x,y,z) 向量部分，w 标量部分
};
```

- 默认构造得到**单位四元数** $(0,0,0,1)$（$w=1$，表示「无旋转」）；
- 构造函数 `Quaternion(x, y, z, w)`，注意 **$w$ 排在最后一个参数**；
- 也支持 `Quaternion(Vec3 v, w)` 用「向量部分 + 标量部分」构造。

> ⚠️ 不同库的排列顺序不一样：GLM 常见 `(w,x,y,z)`，Eigen 内部 `(x,y,z,w)` 但构造函数常按 `(w,x,y,z)` 传参。抄代码、对公式之前，**先确认目标库的排列约定**——这是四元数实践中的第一大坑。

### 1.4 代码表示：Quatf / Quatd

和前两篇的 `Vec3` / `Matrix4` 一个套路，模板结构体加两个常用别名：

```cpp
using Quatf = Quaternion<float>;
using Quatd = Quaternion<double>;
```

```cpp
using namespace gm;

Quatf q0;                      // (0,0,0,1) 单位四元数 = 无旋转
Quatf q1(1, 2, 3, 4);          // x=1, y=2, z=3, w=4
Quatf q2(Vec3f(1, 2, 3), 4);   // 与 q1 等价：向量部分 + 标量部分
Vec3f v = q1.v();              // 取向量部分 (1,2,3)
```

---

## 二、基本运算

### 2.1 加减 / 数乘

$$
q_1 \pm q_2 = (w_1 \pm w_2,\ \vec{v}_1 \pm \vec{v}_2),\qquad \lambda\, q = (\lambda w,\ \lambda\vec{v})
$$

逐分量进行，和普通四维向量一个套路，没什么好说的。真正的主角是乘法。

### 2.2 四元数乘法（Grassmann 积）

四元数最重要的运算。设 $q_1=(w_1,\vec{v}_1)$、$q_2=(w_2,\vec{v}_2)$：

$$
\boxed{\quad q_1 q_2 = \bigl(\,w_1 w_2 - \vec{v}_1\!\cdot\!\vec{v}_2,\ \ w_1\vec{v}_2 + w_2\vec{v}_1 + \vec{v}_1\!\times\!\vec{v}_2\,\bigr) \quad}
$$

结构很好记：

- **标量部分** = 两个标量相乘，**减去**向量部分的**点积**；
- **向量部分** = 交叉展开 $w_1\vec{v}_2 + w_2\vec{v}_1$，**加上**一个**叉积**。

上一篇的点积和叉积在这里正式会师。展开成分量形式（按 $x,y,z,w$ 排列）：

$$
\begin{aligned}
x &= w_1 x_2 + x_1 w_2 + y_1 z_2 - z_1 y_2 \\
y &= w_1 y_2 - x_1 z_2 + y_1 w_2 + z_1 x_2 \\
z &= w_1 z_2 + x_1 y_2 - y_1 x_2 + z_1 w_2 \\
w &= w_1 w_2 - x_1 x_2 - y_1 y_2 - z_1 z_2
\end{aligned}
$$

照着公式逐行翻译，就是 `operator*` 的典型实现：

```cpp
template <typename T>
Quaternion<T> operator*(const Quaternion<T>& a, const Quaternion<T>& b) {
    return Quaternion<T>(
        a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,   // x
        a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,   // y
        a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w,   // z
        a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z);  // w
}
```

**关键性质：**

1. **不满足交换律**：$q_1 q_2 \neq q_2 q_1$——罪魁祸首是叉积，$\vec{v}_1\times\vec{v}_2 = -\vec{v}_2\times\vec{v}_1$；
2. **满足结合律**：$(q_1 q_2)q_3 = q_1(q_2 q_3)$，所以一长串旋转可以放心地合并；
3. **几何意义**：若 $q_1,q_2$ 都是单位旋转四元数，$q_1 q_2$ 表示「**先做 $q_2$ 的旋转，再做 $q_1$ 的旋转**」——和上一篇矩阵「从右到左」的合成顺序完全一致。例如 `qx * qy * qz` 表示先绕 $Z$、再绕 $Y$、最后绕 $X$。

### 2.3 共轭 conjugate()

向量部分取负：

$$
q^* = (w,\ -\vec{v}) = (-x,\ -y,\ -z,\ w)
$$

```cpp
Quaternion conjugate() const {
    return Quaternion(-x, -y, -z, w);
}
```

性质：$(q_1 q_2)^* = q_2^*\, q_1^*$——乘积的共轭 = 共轭的乘积且顺序反转，和矩阵转置 $(AB)^T=B^TA^T$ 一个脾气。

### 2.4 模长 norm()

$$
\|q\| = \sqrt{w^2 + x^2 + y^2 + z^2} = \sqrt{w^2 + \|\vec{v}\|^2}
$$

```cpp
T normSquared() const { return w*w + x*x + y*y + z*z; }  // 免开方版本
T norm() const        { return std::sqrt(normSquared()); }
```

最重要的性质是**乘积性**：

$$
\|q_1 q_2\| = \|q_1\|\cdot\|q_2\|
$$

**两个单位四元数相乘，仍是单位四元数**。这就是单位四元数能稳定表示旋转的数学根基——连乘再多步，长度理论上始终是 1。

### 2.5 逆 inverse()

$$
q^{-1} = \frac{q^*}{\|q\|^2}
$$

**验证**：$q\,q^* = \bigl(w^2+\|\vec{v}\|^2,\ \vec{0}\bigr) = \|q\|^2$（一个纯标量四元数），于是 $q\cdot(q^*/\|q\|^2)=1$，确实是逆没错。

```cpp
Quaternion inverse() const {
    return conjugate() / normSquared();   // 逐分量除以 ‖q‖²
}
```

> **重点**：**单位四元数的逆 = 共轭**。$\|q\|=1$ 时分母是 1，$q^{-1}=q^*$，连除法都省了。图形学里的旋转四元数基本都是单位四元数，这条优化天天在用——地位约等于上一篇「旋转矩阵求逆 = 转置」的免费午餐。

### 2.6 归一化 normalized()

$$
\hat{q} = \frac{q}{\|q\|}
$$

**只有单位四元数才表示纯旋转**。非单位的 $q$ 塞进 $v'=qvq^{-1}$，理论上旋转分量也对，但数值误差会悄悄混进缩放里，所以拿到旋转四元数先归一化是标准动作：

```cpp
Quaternion normalized() const {
    const T n = norm();
    return n > eps ? *this / n : Quaternion();  // 零四元数兜底，防除零
}
```

基本运算用法一览：

```cpp
using namespace gm;

Quatf a(1, 2, 3, 4);
Quatf b(0.5f, 0, 0, 1);

Quatf sum  = a + b;           // 逐分量加
Quatf dif  = a - b;           // 逐分量减
Quatf s2   = a * 2.0f;        // 数乘（也可写作 2.0f * a）
Quatf prod = a * b;           // Grassmann 积，注意 b*a 结果不同！

Quatf conj = a.conjugate();   // (-1,-2,-3,4)
float  n   = a.norm();        // sqrt(1+4+9+16) = sqrt(30)
Quatf inv  = a.inverse();     // conj / 30
Quatf unit = a.normalized();  // a / norm

// 单位四元数的逆 == 共轭
Quatf rot = fromAxisAngle(Vec3f(0,0,1), 0.5f);
bool ok = (rot.inverse() == rot.conjugate());   // true
```

---

## 三、旋转四元数：轴-角 ↔ 四元数

「绕哪个轴、转多少度」是旋转最直觉的描述。本节把它和四元数互相翻译——这对转换是日常高频操作。

### 3.1 半角的秘密：单位四元数表示旋转

设要绕**单位轴** $\hat{a}$（$\|\hat{a}\|=1$）旋转角度 $\theta$，对应的**单位旋转四元数**为

$$
\boxed{\quad q = \Bigl(\sin\frac{\theta}{2}\,\hat{a},\ \ \cos\frac{\theta}{2}\Bigr) \quad}
$$

分量形式：

$$
q = \Bigl(\hat{a}_x\sin\tfrac{\theta}{2},\ \hat{a}_y\sin\tfrac{\theta}{2},\ \hat{a}_z\sin\tfrac{\theta}{2},\ \cos\tfrac{\theta}{2}\Bigr)
$$

**为什么是半角？** 因为四元数「施法」的形式是 $v'=qvq^{-1}$（下一节详述）：$q$ 从左边转 $\theta/2$，$q^{-1}$ 从右边再转 $\theta/2$，两边一夹，合起来正好是完整的 $\theta$。

**验证单位性**：

$$
\|q\|^2 = \sin^2\tfrac{\theta}{2}\underbrace{\|\hat{a}\|^2}_{=1} + \cos^2\tfrac{\theta}{2} = 1 \quad\checkmark
$$

### 3.2 双覆盖：一个旋转，两个四元数

把 $\theta$ 换成 $\theta+2\pi$——还是同一个旋转（多转一整圈），四元数却变成了 $-q$。也就是说：

> **$q$ 和 $-q$ 表示同一个旋转**（双覆盖，Double Cover）：一个旋转恰好对应 4D 球面上一对对跖点。

别小看这件事：SLERP 插值时若不小心在 $q$ 和 $-q$ 之间「直连」，动画会绕一大圈远路——5.3 节的最短弧处理就是专门来收拾它的。

### 3.3 fromAxisAngle：从轴-角到四元数

```cpp
template <typename T>
Quaternion<T> fromAxisAngle(const Vec3<T>& axis, T theta) {
    const Vec3<T> a = axis.normalized();   // 内部归一化，传入的轴不必是单位向量
    const T h = theta * T(0.5);            // 半角
    return Quaternion<T>(
        a.x * std::sin(h), a.y * std::sin(h), a.z * std::sin(h),
        std::cos(h));
}
```

```cpp
using namespace gm;
// 绕 Z 轴逆时针旋转 90°
Quatf rotZ90 = fromAxisAngle(Vec3f(0,0,1), float(M_PI)/2.0f);
// → (0, 0, 0.7071, 0.7071)，即 (0, 0, sin45°, cos45°)
```

### 3.4 toAxisAngle：从四元数回到轴-角

反演公式：

$$
\theta = 2\arccos(w),\qquad \hat{a} = \frac{(x,y,z)}{\sin(\theta/2)}
$$

典型实现有两个细节：$w$ 先 clamp 再 `acos`（浮点误差可能让本该是 1 的值变成 1.0000001，直接喂 `acos` 会得到 NaN）；角度接近 0 时 $\sin(\theta/2)\approx 0$，轴已经没有意义，兜底返回 $(1,0,0)$。

```cpp
template <typename T>
void toAxisAngle(const Quaternion<T>& q, Vec3<T>& axis, T& theta) {
    const Quaternion<T> n = q.normalized();                 // 先归一化
    theta = T(2) * std::acos(clamp(n.w, T(-1), T(1)));      // clamp 防越界
    const T s = std::sqrt(std::max(T(0), T(1) - n.w*n.w));  // sin(θ/2)
    axis = (s < eps) ? Vec3<T>(1, 0, 0)                     // 角度≈0：轴任取
                     : Vec3<T>(n.x, n.y, n.z) / s;
}
```

```cpp
using namespace gm;
Quatf qr = fromAxisAngle(Vec3f(1, 1, 1), 1.2f);

Vec3f axis; float theta;
toAxisAngle(qr, axis, theta);
// theta ≈ 1.2，axis ≈ (1,1,1) 归一化
```

### 3.5 旋转的合成

两个旋转 $q_1, q_2$ 的合成就是 $q = q_1 q_2$，语义「先 $q_2$ 后 $q_1$」，与矩阵完全一致：

```cpp
using namespace gm;
// 绕 Z 转 30°，再转 60°，合成 = 转 90°
Quatf r30 = fromAxisAngle(Vec3f(0,0,1), 0.5236f);  // ~30°
Quatf r60 = fromAxisAngle(Vec3f(0,0,1), 1.0472f);  // ~60°
Quatf composed = r30 * r60;                        // 先 r60 再 r30 → 合计 90°
```

---

## 四、用四元数旋转向量

上一节说 $q$ 「表示」旋转，那到底怎么把一个向量真的转过去？

### 4.1 公式：把向量夹在中间

把三维向量 $\vec{v}$ 包装成**纯四元数**（标量部分为 0）$p=(0,\vec{v})$，则旋转后的向量为

$$
\boxed{\quad p' = q\,p\,q^{-1}, \qquad \vec{v}' = \text{向量部分}(p') \quad}
$$

其中 $q$ 是单位旋转四元数。三步走：**包装 → 左右夹乘 → 取出向量部分**。

### 4.2 推导：结果正是 Rodrigues 旋转公式

设 $q=(s,\vec{n})$，其中

$$
s=\cos\tfrac{\theta}{2},\qquad \vec{n}=\sin\tfrac{\theta}{2}\,\hat{a},\qquad \|\hat{a}\|=1
$$

单位四元数有 $q^{-1}=q^*=(s,-\vec{n})$，待旋转的纯四元数 $p=(0,\vec{v})$。

**第一步**：算 $q\,p$。套 Grassmann 积 $(w_1,\vec{v}_1)(w_2,\vec{v}_2)=(w_1 w_2-\vec{v}_1\!\cdot\!\vec{v}_2,\; w_1\vec{v}_2+w_2\vec{v}_1+\vec{v}_1\!\times\!\vec{v}_2)$：

$$
q\,p = \bigl(s\cdot 0-\vec{n}\!\cdot\!\vec{v},\ \ s\vec{v}+0\cdot\vec{n}+\vec{n}\!\times\!\vec{v}\bigr)
     = \bigl(-\vec{n}\!\cdot\!\vec{v},\ \ s\vec{v}+\vec{n}\!\times\!\vec{v}\bigr)
$$

记 $w_1=-\vec{n}\!\cdot\!\vec{v}$，$\vec{u}=s\vec{v}+\vec{n}\!\times\!\vec{v}$。

**第二步**：算 $(q\,p)\,q^{-1}=(w_1,\vec{u})(s,-\vec{n})$。

标量部分：

$$
w' = w_1\,s - \vec{u}\!\cdot\!(-\vec{n}) = -s(\vec{n}\!\cdot\!\vec{v}) + s(\vec{v}\!\cdot\!\vec{n}) + (\vec{n}\!\times\!\vec{v})\!\cdot\!\vec{n} = 0
$$

前两项相消（点积可交换），第三项为 0（叉积垂直于自己的因子）——**结果仍是纯四元数**，好消息，向量部分就是答案。

向量部分：

$$
\vec{v}' = w_1(-\vec{n}) + s\,\vec{u} + \vec{u}\!\times\!(-\vec{n})
$$

代入 $w_1$ 和 $\vec{u}$，利用 $\vec{v}\!\times\!\vec{n}=-\vec{n}\!\times\!\vec{v}$，以及叉积恒等式 $(\vec{n}\!\times\!\vec{v})\!\times\!\vec{n}=\|\vec{n}\|^2\vec{v}-(\vec{n}\!\cdot\!\vec{v})\vec{n}$，整理得：

$$
\vec{v}' = 2(\vec{n}\!\cdot\!\vec{v})\vec{n} + (s^2-\|\vec{n}\|^2)\vec{v} + 2s(\vec{n}\!\times\!\vec{v})
$$

**第三步**：代回半角，用倍角公式收尾：

- $s^2-\|\vec{n}\|^2=\cos^2\tfrac{\theta}{2}-\sin^2\tfrac{\theta}{2}=\cos\theta$
- $2(\vec{n}\!\cdot\!\vec{v})\vec{n}=2\sin^2\tfrac{\theta}{2}(\hat{a}\!\cdot\!\vec{v})\hat{a}=(1-\cos\theta)(\hat{a}\!\cdot\!\vec{v})\hat{a}$
- $2s(\vec{n}\!\times\!\vec{v})=2\cos\tfrac{\theta}{2}\sin\tfrac{\theta}{2}(\hat{a}\!\times\!\vec{v})=\sin\theta(\hat{a}\!\times\!\vec{v})$

最终：

$$
\boxed{\quad \vec{v}' = \cos\theta\,\vec{v} + (1-\cos\theta)(\hat{a}\!\cdot\!\vec{v})\hat{a} + \sin\theta\,(\hat{a}\!\times\!\vec{v}) \quad}
$$

这正是著名的 **Rodrigues 旋转公式**——「绕轴 $\hat{a}$ 转 $\theta$」的标准公式。证毕。四元数旋转不是玄学，它和 Rodrigues 公式严格等价，只是换了一套记账方式。

### 4.3 rotateVector 的典型实现

```cpp
template <typename T>
Vec3<T> rotateVector(const Quaternion<T>& q, const Vec3<T>& v) {
    const Quaternion<T> n = q.normalized();        // 保证单位，防止缩放混入
    const Quaternion<T> p(v.x, v.y, v.z, T(0));    // 包装成纯四元数
    const Quaternion<T> r = n * p * n.inverse();   // q p q⁻¹
    return Vec3<T>(r.x, r.y, r.z);                 // 取出向量部分
}
```

```cpp
using namespace gm;
// 绕 Z 轴 +90°：X 轴单位向量 → Y 轴单位向量
Quatf rotZ90 = fromAxisAngle(Vec3f(0,0,1), float(M_PI)/2.0f);
Vec3f r  = rotateVector(rotZ90, Vec3f(1,0,0));   // ≈ (0,1,0)
Vec3f r2 = rotateVector(rotZ90, Vec3f(2,0,0));   // ≈ (0,2,0)，长度保持 2
```

> 对比直接用矩阵 $v'=Rv$：四元数版本省去矩阵构造，且因为 $q^{-1}$ 把 $q$ 引入的缩放精确抵消，**保长保角**。追求极致性能时，还可以把 $qvq^{-1}$ 展开为 $t=2\,\vec{n}\times\vec{v};\ \vec{v}'=\vec{v}+w\,t+t\times\vec{n}$ 的直接形式，省掉完整乘法——思路与上面完全等价。

---

## 五、四元数插值：LERP / NLERP / SLERP

动画与相机过渡，经常需要在两个朝向 $q_0, q_1$ 之间平滑地「补」出中间姿态。三种方法，质量从低到高。

### 5.1 LERP：最便宜，但角速度不均匀

$$
\mathrm{lerp}(q_0,q_1,t) = (1-t)\,q_0 + t\,q_1
$$

直接在 4D 空间里做线性插值。两个问题：① 结果不是单位四元数（要再归一化）；② **角速度不均匀**——在连接两点的弦上匀速走，投影到球面上就是中间快、两端慢，动画看起来一顿一顿的。

### 5.2 NLERP：拉回单位球面

$$
\mathrm{nlerp}(q_0,q_1,t) = \frac{(1-t)\,q_0 + t\,q_1}{\|(1-t)\,q_0 + t\,q_1\|}
$$

就是 LERP 再归一化，把结果「拉回」单位球面。便宜、结果单位，**对大部分动画已经够好**；缺点是角速度仍不严格均匀（沿弦匀速、投影到弧上自然不匀）。当两四元数夹角较小时，误差可以忽略。

### 5.3 SLERP：沿大圆弧匀角速度

**目标。** 在 4D 单位超球面上，沿 $q_0\to q_1$ 的**大圆弧**做**匀角速度**插值——插值点与 $q_0$ 的夹角随 $t$ 线性增长：$\phi(t)=t\theta$，其中 $\theta$ 是 $q_0,q_1$ 的夹角。就像飞机走大圆航线：不抄近路也不绕远，全程匀速。

**几何推导（把四元数当 4D 向量看）。** 夹角由 4D 内积给出：

$$
\cos\theta = q_0\cdot q_1 = w_0 w_1 + x_0 x_1 + y_0 y_1 + z_0 z_1
$$

$q_0,q_1$ 张成一张二维平面。在这张平面里取一组**正交基** $\{q_0,\ \hat{q}_\perp\}$，其中

$$
q_\perp = q_1 - (q_1\!\cdot\!q_0)\,q_0 = q_1 - \cos\theta\,q_0
$$

是 $q_1$ 减去它在 $q_0$ 方向投影后的「垂直分量」，模长 $\|q_\perp\|=\sin\theta$，故 $\hat{q}_\perp = q_\perp/\sin\theta$。在这组基下，从 $q_0$ 出发转角度 $\phi$ 的点是

$$
p(\phi) = \cos\phi\,q_0 + \sin\phi\,\hat{q}_\perp
$$

令 $\phi=t\theta$，代回 $\hat{q}_\perp=(q_1-\cos\theta\,q_0)/\sin\theta$：

$$
\mathrm{slerp} = \cos(t\theta)\,q_0 + \frac{\sin(t\theta)}{\sin\theta}(q_1-\cos\theta\,q_0)
$$

合并 $q_0$ 的系数（利用 $\cos(t\theta)\sin\theta-\sin(t\theta)\cos\theta=\sin((1-t)\theta)$）：

$$
\boxed{\quad \mathrm{slerp}(q_0,q_1,t) = \frac{\sin((1-t)\theta)}{\sin\theta}\,q_0 + \frac{\sin(t\theta)}{\sin\theta}\,q_1 \quad}
$$

检验：$t=0$ 得 $q_0$，$t=1$ 得 $q_1$；任意时刻结果都在大圆弧上、模长恒为 1、角速度恒定。

**工程补丁一：最短弧。** $q$ 与 $-q$ 是同一个旋转，但在 4D 球面上是对跖点。若 $\cos\theta<0$（夹角 $>90°$），直接 slerp 会绕远路——动画表现为「转一大圈才到」。约定：**若 $\cos\theta<0$，把 $q_1$ 换成 $-q_1$**（同一旋转、走短弧），再令 $\cos\theta\leftarrow-\cos\theta$。

**工程补丁二：小角度退化。** $\theta\to 0$ 时 $\sin\theta\to 0$，公式出现 $0/0$ 的数值病态。当 $\cos\theta>0.9995$（$\theta\lesssim 1.8°$）时直接退回 NLERP，误差可忽略且避免除零。

### 5.4 slerp 实现与三种方法对比

```cpp
template <typename T>
Quaternion<T> slerp(const Quaternion<T>& q0, const Quaternion<T>& q1, T t) {
    Quaternion<T> a = q0.normalized(), b = q1.normalized();
    T cosT = clamp(dot4(a, b), T(-1), T(1));    // 把四元数当 4D 向量做点积

    if (cosT < T(0)) { b = -b; cosT = -cosT; }  // 补丁一：q 与 -q 同旋转，走最短弧

    if (cosT > T(0.9995))                       // 补丁二：夹角太小，退化 NLERP 防除零
        return lerp(a, b, t).normalized();

    const T theta = std::acos(cosT);
    const T s = std::sin(theta);
    return (std::sin((T(1)-t)*theta)/s)*a + (std::sin(t*theta)/s)*b;
}
```

```cpp
using namespace gm;
Quatf A = fromAxisAngle(Vec3f(0,0,1), float(M_PI)/2);   // 90°
Quatf B = fromAxisAngle(Vec3f(0,0,1), 0.5236f);          // 30°

Quatf r0 = slerp(A, B, 0.0f);   // == A.normalized()
Quatf r1 = slerp(A, B, 1.0f);   // == B.normalized()
Quatf rt = slerp(A, B, 0.37f);  // 中间朝向，仍是单位四元数
```

| 方法 | 结果单位？ | 角速度均匀 | 成本 | 适用 |
|---|:---:|:---:|:---:|---|
| LERP | 否 | 否 | 最低 | 基本不用 |
| NLERP | 是 | 近似 | 低 | 动画、相机过渡（夹角小） |
| SLERP | 是 | **精确** | 中（含 sin/acos） | 精确旋转链、关键帧插值 |

---

## 六、四元数 vs 欧拉角：万向节死锁

### 6.1 欧拉角：直观，但有坑

用三个独立角度 $(\alpha,\beta,\gamma)$ 描述姿态，依次绕选定的坐标轴转。常见约定有 **ZYX（Yaw-Pitch-Roll）**、**XYZ** 等。`fromEulerXYZ(rx, ry, rz)` 采用 XYZ 顺序（列向量约定，合成 $q_x q_y q_z$，对应「先 $R_z$ 再 $R_y$ 再 $R_x$」）：

$$
q = q_x\,q_y\,q_z,\qquad q_x=\text{fromAxisAngle}((1,0,0),\,r_x),\ \ldots
$$

```cpp
using namespace gm;
Quatf q = fromEulerXYZ(rx, ry, rz);
```

欧拉角的优点是**直观**——「偏航 / 俯仰 / 翻滚」人脑好理解，所以编辑器 UI、相机控制输入常用它。但拿来插值和连续旋转，它有个致命伤。

### 6.2 万向节死锁：丢掉的那个自由度

按固定轴序旋转时，若**中间那次旋转到了 $\pm 90°$**，第一次和第三次的旋转轴会重合，丢掉一个自由度。

以 ZYX（Yaw-$Z$ → Pitch-$Y$ → Roll-$X$）为例，当 Pitch（绕 $Y$）$=\pm 90°$：

- 原本的 $Z$ 轴经旋转后恰好落到了 $X$ 轴上；
- Yaw（绕 $Z$）和 Roll（绕 $X$）的作用轴共线，**两者只能合成一个旋转**；
- 3 个参数只剩 2 个独立自由度——这就是「死锁」。

直观比喻：三个嵌套的万向节环，中间环转 90° 时内外两环共面，再转外环和转内环效果一样，系统「卡住」了一个维度。数学本质是「三参数 → SO(3)」的映射在这类姿态处**雅可比秩亏**——参数化自带的拓扑奇点，不是什么物理故障。

**后果**：死锁点附近插值会剧烈抖动、导数奇异，无法平滑过渡。这是欧拉角做动画 / 插值的致命缺陷，也是四元数最大的存在意义。

### 6.3 四元数赢在哪

| 优势 | 说明 |
|---|---|
| **无万向节死锁** | 4 个参数描述 SO(3) 的 3 个自由度，多出的 1 维恰好绕开三参数表示的拓扑奇点 |
| **插值平滑** | SLERP 在球面上匀角速度；欧拉角三轴独立插值，路径会扭曲 |
| **合成简单** | 两次旋转合并只需 $q_1 q_2$ 一次四元数乘法；矩阵合并要 64 次乘加 |
| **数值稳定** | 单位四元数相乘仍是单位四元数（乘积性）；矩阵连乘正交性会漂移，需定期正交化 |
| **存储紧凑** | 仅 4 个浮点数；旋转矩阵要 9 个 |

### 6.4 三种旋转表示对比

| 维度 | 欧拉角 | 四元数 | 旋转矩阵 |
| --- | --- | --- | --- |
| **存储** | 3 个数（最省） | 4 个数 | 9 个数 |
| **表示唯一性** | 唯一（给定轴序） | 不唯一（$q$ 与 $-q$ 同旋转） | 唯一 |
| **可读性** | ★★★★★ 直观 | ★★ 需换算 | ★ 难读 |
| **旋转合成** | 难（要转矩阵） | 容易（$q_1 q_2$） | 中（矩阵乘） |
| **插值质量** | 差（易扭曲） | ★★★★★（SLERP） | 差 |
| **奇异性** | 有 Gimbal Lock | 无 | 无（但数值漂移） |
| **数值稳定性** | 一般 | 好（单位性可保持） | 一般（正交性易漂移） |
| **GPU/着色器** | 少用 | 常用 | 最常用 |

> 经验法则：**人机交互**用欧拉角（输入），**内部计算与存储**用四元数，**顶点变换**转成矩阵（GPU 友好）。

---

## 七、四元数 ↔ 旋转矩阵

四元数负责存储、合成与插值，最终干活（变换顶点）还得交给矩阵——所以互转是家常便饭。

### 7.1 toMatrix：四元数转矩阵

设 $q=(x,y,z,w)$ 为**单位**四元数，对应的 $3\times3$（工程上扩展为 $4\times4$）旋转矩阵为

$$
R = \begin{bmatrix}
1-2(y^2+z^2) & 2(xy-wz)      & 2(xz+wy)      \\
2(xy+wz)     & 1-2(x^2+z^2)  & 2(yz-wx)      \\
2(xz-wy)     & 2(yz+wx)      & 1-2(x^2+y^2)
\end{bmatrix}
$$

由来：把 $v'=qvq^{-1}$ 的每一步展开成 $\vec{v}'=R\vec{v}$，收集各分量的系数即得上式。典型实现先归一化 $q$，再按上式填进 `Matrix4`（列主序、仅旋转、无平移缩放）：

```cpp
template <typename T>
Matrix4<T> toMatrix(const Quaternion<T>& q) {
    const Quaternion<T> n = q.normalized();   // 保证单位
    const T x = n.x, y = n.y, z = n.z, w = n.w;
    Matrix4<T> r = Matrix4<T>::identity();
    r(0,0) = 1 - 2*(y*y + z*z);  r(1,0) = 2*(x*y + w*z);      r(2,0) = 2*(x*z - w*y);
    r(0,1) = 2*(x*y - w*z);      r(1,1) = 1 - 2*(x*x + z*z);  r(2,1) = 2*(y*z + w*x);
    r(0,2) = 2*(x*z + w*y);      r(1,2) = 2*(y*z - w*x);      r(2,2) = 1 - 2*(x*x + y*y);
    return r;
}
```

（`r(col, row)` 是上一篇的矩阵下标接口：第一个参数是**列**，别看反了。）

```cpp
using namespace gm;
Quatf rotZ90 = fromAxisAngle(Vec3f(0,0,1), float(M_PI)/2);
Matrix4f M = toMatrix(rotZ90);
Vec3f r = M.transformDirection(Vec3f(1,0,0));   // ≈ (0,1,0)
```

### 7.2 fromMatrix：Shepperd 分支法

由矩阵元素反解 $x,y,z,w$，如果只用迹（trace）硬算，某些姿态下除数过小、数值误差大。**Shepperd 方法**的核心思路：比较矩阵对角元和迹，**挑最大的那个分量先求**，保证除数最大、任何姿态下都数值稳定——工业界标准做法。四个分支：

$$
\begin{cases}
\text{若 }\mathrm{tr}=m_{00}+m_{11}+m_{22}>0: & S=4w=\sqrt{\mathrm{tr}+1}\cdot 2,\ \ w=\tfrac{S}{4},\ x=\tfrac{m_{21}-m_{12}}{S},\ y=\tfrac{m_{02}-m_{20}}{S},\ z=\tfrac{m_{10}-m_{01}}{S} \\[4pt]
\text{若 }m_{00}\text{ 最大}: & S=4x,\ x=\tfrac{S}{4},\ y=\tfrac{m_{01}+m_{10}}{S},\ z=\tfrac{m_{02}+m_{20}}{S},\ w=\tfrac{m_{21}-m_{12}}{S} \\[4pt]
\text{若 }m_{11}\text{ 最大}: & S=4y,\ \ldots \\
\text{若 }m_{22}\text{ 最大}: & S=4z,\ \ldots
\end{cases}
$$

（$m_{ij}=R[i][j]$。）前两个分支的代码长这样，后两个分支同套路：

```cpp
template <typename T>
Quaternion<T> fromMatrix(const Matrix4<T>& m) {
    const T tr = m(0,0) + m(1,1) + m(2,2);            // 左上 3×3 的迹
    Quaternion<T> q;
    if (tr > T(0)) {                                   // 分支一：w 最大，除数最安全
        const T S = std::sqrt(tr + T(1)) * T(2);       // S = 4w
        q.w = S / T(4);
        q.x = (m(1,2) - m(2,1)) / S;
        q.y = (m(2,0) - m(0,2)) / S;
        q.z = (m(0,1) - m(1,0)) / S;
    } else if (m(0,0) > m(1,1) && m(0,0) > m(2,2)) {  // 分支二：x 最大
        const T S = std::sqrt(T(1) + m(0,0) - m(1,1) - m(2,2)) * T(2);  // S = 4x
        q.w = (m(1,2) - m(2,1)) / S;
        q.x = S / T(4);
        q.y = (m(0,1) + m(1,0)) / S;
        q.z = (m(0,2) + m(2,0)) / S;
    }
    // 分支三 / 四：y 最大、z 最大，完全同理……
    return q.normalized();
}
```

```cpp
using namespace gm;
Matrix4f M = toMatrix(rotZ90);
Quatf back = fromMatrix(M);                    // 矩阵 → 四元数，往返一致
Vec3f bv = rotateVector(back, Vec3f(1,0,0));   // ≈ (0,1,0)，与原旋转相同
```

### 7.3 互转的应用链

- **存储 / 网络传输**：存四元数（4 个 float）；
- **每帧动画 / 物理**：用四元数合成、SLERP；
- **提交渲染管线**：`toMatrix` 转成 `mat4`，乘进 MVP；
- **从 DCC 软件 / 物理引擎读回**：常拿到矩阵，用 `fromMatrix` 转回四元数。

---

## 八、面试速记

### 核心公式速查

| 内容 | 公式 |
|---|---|
| 定义 | $q=w+xi+yj+zk=(w,\vec{v})$，$i^2=j^2=k^2=ijk=-1$ |
| Grassmann 积 | $(w_1w_2-\vec{v}_1\!\cdot\!\vec{v}_2,\ w_1\vec{v}_2+w_2\vec{v}_1+\vec{v}_1\!\times\!\vec{v}_2)$ |
| 共轭 | $q^*=(-x,-y,-z,w)$ |
| 范数 | $\|q\|=\sqrt{w^2+x^2+y^2+z^2}$，且 $\|q_1 q_2\|=\|q_1\|\|q_2\|$ |
| 逆 | $q^{-1}=q^*/\|q\|^2$；**单位四元数逆 = 共轭** |
| 轴-角 → 四元数 | $q=\bigl(\sin\frac{\theta}{2}\hat{a},\ \cos\frac{\theta}{2}\bigr)$ |
| 旋转向量 | $p'=q\,p\,q^{-1}$（$p=(0,\vec{v})$），等价 Rodrigues 公式 |
| SLERP | $\dfrac{\sin((1-t)\theta)}{\sin\theta}q_0+\dfrac{\sin(t\theta)}{\sin\theta}q_1$，$\cos\theta=q_0\!\cdot\!q_1$ |

### 四元数 vs 欧拉角（必背对比）

| 维度 | 欧拉角 | 四元数 |
|---|---|---|
| 存储 | 3 数（省） | 4 数 |
| 可读性 | 直观（Yaw/Pitch/Roll） | 需换算 |
| 合成 | 难 | $q_1 q_2$，一次乘法 |
| 插值 | 易扭曲、不匀速 | SLERP 匀角速度 |
| 奇异性 | **有 Gimbal Lock** | **无** |
| 数值稳定性 | 一般 | 好（单位性可保持） |
| 表示唯一性 | 唯一 | $q\equiv -q$（二选一） |

### 必背要点

1. 存储按 **$(x,y,z,w)$**，$w$ 是标量部分；Hamilton 约定。
2. 乘法**不可交换**；$q_1 q_2$ 表示「先 $q_2$ 后 $q_1$」，与矩阵列向量约定一致。
3. **单位四元数的逆 = 共轭**——图形学最常用的优化。
4. **$q$ 与 $-q$ 表示同一旋转**（双覆盖）→ SLERP 判 $\cos\theta<0$ 取负走最短弧。
5. **$v'=qvq^{-1}$** 展开后就是 Rodrigues 公式；半角是因为 $q$ 和 $q^{-1}$ 各贡献一半角度。
6. **SLERP** 在 $\theta\to 0$ 时退化到 NLERP 防除零。
7. **欧拉角有 Gimbal Lock，四元数没有**——四元数最大的存在意义。
8. **矩阵 → 四元数用 Shepperd 分支法**（挑最大分量先算，任何姿态下数值稳定）。

### 必记口诀

- **w 排最后一个**：$(x,y,z,w)$，构造时别传反；跨库先查排列约定。
- **乘法看叉积**：交换律就死在 $\vec{v}_1\times\vec{v}_2$ 上；合成顺序「先右后左」，与矩阵一致。
- **单位逆 = 共轭**：转置之于正交矩阵，共轭之于单位四元数——同一份免费午餐。
- **转 θ 存 θ/2**：轴-角转四元数，正弦余弦都吃半角。
- **q 与 -q 同旋转**：插值前先判 $\cos\theta$ 取负，走最短弧。
- **万向节死锁问欧拉角，别问四元数**。

### 本文 API 速查（命名空间 `gm`）

| API | 作用 |
|---|---|
| `Quatf` / `Quatd` | float / double 四元数类型别名 |
| `a + b`, `a - b`, `a * s`, `a * b` | 加减 / 数乘 / Grassmann 积（乘法不可交换） |
| `q.v()` | 取向量部分 $(x,y,z)$ |
| `q.conjugate()` | 共轭 $(w,-\vec{v})$ |
| `q.norm()`, `q.normSquared()` | 模长 / 模长平方（免开方） |
| `q.inverse()` | 逆 $q^*/\|q\|^2$（单位四元数 = 共轭） |
| `q.normalized()` | 归一化（零四元数返回单位四元数兜底） |
| `gm::fromAxisAngle(axis, theta)` | 轴-角 → 四元数（内部归一化轴） |
| `gm::toAxisAngle(q, axis, theta)` | 四元数 → 轴-角 |
| `gm::fromEulerXYZ(rx, ry, rz)` | 欧拉角（XYZ 序）→ 四元数 |
| `gm::rotateVector(q, v)` | 用 q 旋转向量（内部保证单位） |
| `gm::slerp(q0, q1, t)` | 球面插值（含最短弧与小角度退化处理） |
| `gm::toMatrix(q)` | 四元数 → 4×4 旋转矩阵（列主序） |
| `gm::fromMatrix(m)` | 旋转矩阵 → 四元数（Shepperd 分支法） |

---
