# 1.3 四元数 (Quaternion)

> 头文件：`math/Quaternion.h`（依赖 `math/Vec3.h`、`math/Matrix4.h`）
> 命名空间：`gm`　类型别名：`Quatf = Quaternion<float>`、`Quatd = Quaternion<double>`

四元数（Quaternion）是复数在四维空间上的推广，由哈密顿（W. R. Hamilton）于 1843 年提出。在计算机图形学中，**单位四元数**是表示三维旋转的最优工具之一：它只用 4 个数、没有万向节死锁、合成简单（一次乘法）、插值平滑（SLERP 能做到匀角速度）、数值稳定。本文围绕 `gm::Quaternion` 的实际实现，覆盖定义、运算、旋转、插值、与矩阵/欧拉角互转等全部内容。

***

## 目录

1. [定义与基本规则](#1-定义与基本规则)
2. [基本运算](#2-基本运算)
3. [旋转四元数：轴-角 ↔ 四元数](#3-旋转四元数轴角--四元数)
4. [用四元数旋转向量 (v' = q,v,q^{-1})](#4-用四元数旋转向量)
5. [四元数插值：LERP / NLERP / SLERP](#5-四元数插值)
6. [四元数 vs 欧拉角](#6-四元数-vs-欧拉角)
7. [四元数 ↔ 旋转矩阵](#7-四元数--旋转矩阵)
8. [面试速记](#8-面试速记)

***

## 1. 定义与基本规则

### 1.1 从复数到四元数

复数有两个实基底 $\{1,\,i\}$，满足 $i^2 = -1$。复数可以表示二维平面的旋转（如 $e^{i\theta}=\cos\theta+i\sin\theta$）。

四元数把这个想法推广到三维旋转：用**四个实基底** $\{1,\,i,\,j,\,k\}$，定义为

$$
q = w + x\,i + y\,j + z\,k
$$

其中 $w,x,y,z \in \mathbb{R}$，$i,j,k$ 是三个虚部单位。为了与工程实现一致，本项目采用 **Hamilton 约定**（最经典的约定），并约定：

- $w$ 是**标量（实）部分**
- $(x,y,z)$ 是**向量（虚）部分**，记 $\vec{v}=(x,y,z)$

因此常把四元数简记为

$$
q = (w,\ \vec{v}) \quad\text{或}\quad q = w + \vec{v}
$$

### 1.2 虚部单位的运算规则（Hamilton 约定）

$$
i^2 = j^2 = k^2 = ijk = -1
$$

由此可推出循环乘法关系：

$$
ij = k,\quad jk = i,\quad ki = j
$$

以及**反序相乘取负**：

$$
ji = -k,\quad kj = -i,\quad ik = -j
$$

> 直觉：$i\to j\to k\to i$ 顺序乘为正，逆序为负。注意这正是一个**非交换代数**，是四元数乘法不可交换的根源。

### 1.3 存储排列约定（重要）

本项目的 `gm::Quaternion<T>` 按 **(x, y, z, w)** 排列存储：

```cpp
template <typename T>
struct Quaternion {
    T x, y, z, w;  // w 是标量(实)部分，(x,y,z) 是向量(虚)部分
};
```

- 默认构造得到**单位四元数** `q = (0, 0, 0, 1)`（即 $w=1$，表示"无旋转"）。
- 构造函数签名 `Quaternion(x, y, z, w)`，注意 $w$ 在最后一个参数。
- 也支持 `Quaternion(Vec3 v, w)` 由"向量部分 + 标量部分"构造。

```cpp
gm::Quatf q0;                  // (0,0,0,1) 单位四元数 = 无旋转
gm::Quatf q1(1, 2, 3, 4);      // x=1, y=2, z=3, w=4
gm::Quatf q2(gm::Vec3f(1,2,3), 4); // 与 q1 等价
gm::Vec3f v = q1.v();          // 取向量部分 (1,2,3)
```

> ⚠️ 不同库的存储顺序不同（如 GLM 用 `(w,x,y,z)`、Eigen 用内部 `(x,y,z,w)` 但构造常为 `(w,x,y,z)`）。使用前务必确认。本项目一律 `(x,y,z,w)`。

***

## 2. 基本运算

### 2.1 加减、数乘（逐分量）

$$
q_1 \pm q_2 = (w_1 \pm w_2,\ \vec{v}_1 \pm \vec{v}_2)
$$

$$
\lambda\, q = (\lambda w,\ \lambda\vec{v})
$$

这些运算逐分量进行，**与普通向量无异**。

### 2.2 四元数乘法（Grassmann 积）—— 核心

这是四元数最重要的运算。设 $q_1=(w_1,\vec{v}_1)$、$q_2=(w_2,\vec{v}_2)$，则

$$
\boxed{\quad q_1 q_2 = \bigl(\,w_1 w_2 - \vec{v}_1\!\cdot\!\vec{v}_2,\ \ w_1\vec{v}_2 + w_2\vec{v}_1 + \vec{v}_1\!\times\!\vec{v}_2\,\bigr) \quad}
$$

即：

- **标量部分**：$w = w_1 w_2 - \vec{v}_1\cdot\vec{v}_2$（点积贡献，带负号）
- **向量部分**：$\vec{v} = w_1\vec{v}_2 + w_2\vec{v}_1 + \vec{v}_1\times\vec{v}_2$（叉积贡献）

展开成分量形式（按 $x,y,z,w$ 排列）：

$$
\begin{aligned}
x &= w_1 x_2 + x_1 w_2 + y_1 z_2 - z_1 y_2 \\
y &= w_1 y_2 - x_1 z_2 + y_1 w_2 + z_1 x_2 \\
z &= w_1 z_2 + x_1 y_2 - y_1 x_2 + z_1 w_2 \\
w &= w_1 w_2 - x_1 x_2 - y_1 y_2 - z_1 z_2
\end{aligned}
$$

> 这正是 `operator*` 的实现方式（见 `Quaternion.h` 第 77–82 行）。

#### 关键性质

1. **不满足交换律**：$q_1 q_2 \neq q_2 q_1$（因叉积 $\vec{v}_1\times\vec{v}_2 = -\vec{v}_2\times\vec{v}_1$）。
2. **满足结合律**：$(q_1 q_2)q_3 = q_1(q_2 q_3)$。
3. **几何意义**：若 $q_1,q_2$ 都是单位旋转四元数，则

   $q_1 q_2 \text{ 表示"先做 } q_2 \text{ 的旋转，再做 } q_1 \text{ 的旋转"}$

   这与矩阵列向量约定下"从右到左"的合成顺序一致。例如 `qx * qy * qz` 表示先绕 $Z$、再绕 $Y$、最后绕 $X$。

### 2.3 共轭（Conjugate）

向量部分取负：

$$
q^* = (w,\ -\vec{v}) = (-x,\ -y,\ -z,\ w)
$$

性质：$(q_1 q_2)^* = q_2^*\, q_1^*$（顺序反转）。

### 2.4 模长 / 范数（Norm）

$$
\|q\| = \sqrt{w^2 + x^2 + y^2 + z^2} = \sqrt{w^2 + \|\vec{v}\|^2}
$$

重要性质：

$$
\|q_1 q_2\| = \|q_1\|\cdot\|q_2\|
$$

所以**两个单位四元数相乘仍是单位四元数**——这是单位四元数能稳定表示旋转的数学根基。

### 2.5 逆（Inverse）

$$
q^{-1} = \frac{q^*}{\|q\|^2}
$$

**验证**：$q\,q^*$ 的向量部分 $\vec{v}\cdot\vec{v} - \vec{v}\times\vec{v}=\|\vec{v}\|^2$，标量部分 $w^2+\vec{v}\cdot(-\vec{v})$…… 严格地 $q q^* = (w^2+\|\vec{v}\|^2,\ \vec{0}) = \|q\|^2$，于是 $q\,(q^*/\|q\|^2)=1$。

> **单位四元数的逆 = 共轭**：因为 $\|q\|=1$，$q^{-1}=q^*$。这是图形学中用得最多的情形，省了一次除法。

### 2.6 归一化（Normalize）

$$
\hat{q} = \frac{q}{\|q\|}
$$

**只有单位四元数才表示纯旋转**；非单位四元数在 $v'=qvq^{-1}$ 中虽然旋转部分正确，但容易被数值误差污染，所以旋转前一般都先归一化。

### 2.7 C++ 示例

```cpp
#include "math/Quaternion.h"
using namespace gm;

Quatf a(1, 2, 3, 4);
Quatf b(0.5f, 0, 0, 1);

Quatf sum  = a + b;          // 逐分量加
Quatf dif  = a - b;          // 逐分量减
Quatf s2   = a * 2.0f;       // 数乘（也可写作 2.0f * a）
Quatf prod = a * b;          // Grassmann 积，注意 b*a 与 a*b 不同！

Quatf conj = a.conjugate();  // (-1,-2,-3,4)
float  n   = a.norm();       // sqrt(1+4+9+16)=sqrt(30)
Quatf inv  = a.inverse();    // conj / 30
Quatf unit = a.normalized(); // a / norm

// 单位四元数的逆 == 共轭
Quatf rot = fromAxisAngle(Vec3f(0,0,1), 0.5f);
bool ok = (rot.inverse() == rot.conjugate()); // true
```

***

## 3. 旋转四元数：轴-角 ↔ 四元数

### 3.1 单位四元数表示旋转

设要绕**单位轴** $\hat{a}$（$\|\hat{a}\|=1$）旋转角度 $\theta$，则对应的**单位旋转四元数**为

$$
\boxed{\quad q = \Bigl(\sin\frac{\theta}{2}\,\hat{a},\ \ \cos\frac{\theta}{2}\Bigr) \quad}
$$

分量形式：

$$
q = \Bigl(\hat{a}_x\sin\tfrac{\theta}{2},\ \hat{a}_y\sin\tfrac{\theta}{2},\ \hat{a}_z\sin\tfrac{\theta}{2},\ \cos\tfrac{\theta}{2}\Bigr)
$$

为什么是半角 $\theta/2$？因为旋转作用形式是 $v'=qvq^{-1}$（见第 4 节），$q$ 和 $q^{-1}$ 各贡献半个角度，合起来才是完整的 $\theta$。

**双覆盖性（Double Cover）**：$q$ 和 $-q$ 表示**同一个旋转**（旋转角差 $2\pi$，结果相同）。这就是 SLERP 中"取最短弧"时要对 $q_1$ 取负的依据。

#### 验证单位性

$$
\|q\|^2 = \sin^2\tfrac{\theta}{2}\underbrace{\|\hat{a}\|^2}_{=1} + \cos^2\tfrac{\theta}{2} = 1 \quad\checkmark
$$

### 3.2 轴-角 → 四元数（`fromAxisAngle`）

```cpp
template <typename T>
inline Quaternion<T> fromAxisAngle(const Vec3<T>& axis, T theta);
```

- 内部先对 `axis` 归一化，因此调用者传入的轴不必是单位向量。
- 返回 $q = (\hat{a}\sin(\theta/2),\ \cos(\theta/2))$。

```cpp
// 绕 Z 轴逆时针旋转 90°
Quatf rotZ90 = fromAxisAngle(Vec3f(0,0,1), float(M_PI)/2.0f);
// → (0, 0, sin(45°), cos(45°)) ≈ (0, 0, 0.7071, 0.7071)
```

### 3.3 四元数 → 轴-角（`toAxisAngle`）

```cpp
template <typename T>
inline void toAxisAngle(const Quaternion<T>& q, Vec3<T>& axis, T& theta);
```

反演公式：

$$
\theta = 2\arccos(w),\qquad \hat{a} = \frac{(x,y,z)}{\sin(\theta/2)}
$$

实现要点：先归一化 $q$，对 $w$ 做 clamp 防止 `acos` 越界；当 $\sin(\theta/2)\approx 0$（即角度近似 0）时，轴无意义，返回默认 $(1,0,0)$。

```cpp
Vec3f axis(1, 1, 1);
float theta = 1.2f;
Quatf qr = fromAxisAngle(axis, theta);

Vec3f axis2; float theta2;
toAxisAngle(qr, axis2, theta2);
// theta2 ≈ 1.2，axis2.normalized() ≈ axis.normalized()
```

### 3.4 旋转的合成

两个旋转 $q_1, q_2$ 合成：$q = q_1 q_2$，注意顺序"先 $q_2$ 后 $q_1$"。

```cpp
// 绕 Z 转 30°，再转 60° = 转 90°
Quatf r30 = fromAxisAngle(Vec3f(0,0,1), 0.5236f);  // ~30°
Quatf r60 = fromAxisAngle(Vec3f(0,0,1), 1.0472f);  // ~60°
Quatf composed = r30 * r60;                          // 先 r60 再 r30 → 90°
```

***

## 4. 用四元数旋转向量

### 4.1 公式

把三维向量 $\vec{v}$ 当作**纯四元数**（标量部分为 0）$p=(0,\,\vec{v})$，则旋转后向量为

$$
\boxed{\quad p' = q\,p\,q^{-1}, \qquad \vec{v}' = \text{向量部分}(p') \quad}
$$

其中 $q$ 是单位旋转四元数。若 $q$ 非单位，结果会被缩放，因此实现里会先归一化。

### 4.2 推导：$q\,p\,q^{-1}$ 等价于 Rodrigues 公式

设 $q=(s,\,\vec{n})$，其中

$$
s=\cos\tfrac{\theta}{2},\qquad \vec{n}=\sin\tfrac{\theta}{2}\,\hat{a},\qquad \|\hat{a}\|=1
$$

单位四元数有 $q^{-1}=q^*=(s,-\vec{n})$。待旋转的纯四元数 $p=(0,\vec{v})$。

**第一步**：计算 $q\,p$（用 Grassmann 积 $(w_1,\vec{v}_1)(w_2,\vec{v}_2)=(w_1 w_2-\vec{v}_1\!\cdot\!\vec{v}_2,\;w_1\vec{v}_2+w_2\vec{v}_1+\vec{v}_1\!\times\!\vec{v}_2)$）：

$$
q\,p = \bigl(s\cdot0-\vec{n}\!\cdot\!\vec{v},\ \ s\vec{v}+0\cdot\vec{n}+\vec{n}\!\times\!\vec{v}\bigr)
     = \bigl(-\vec{n}\!\cdot\!\vec{v},\ \ s\vec{v}+\vec{n}\!\times\!\vec{v}\bigr)
$$

记 $w_1=-\vec{n}\!\cdot\!\vec{v}$，$\vec{u}=s\vec{v}+\vec{n}\!\times\!\vec{v}$。

**第二步**：计算 $(q\,p)\,q^{-1}=(w_1,\vec{u})(s,-\vec{n})$。

**标量部分**：

$$
w' = w_1\,s - \vec{u}\!\cdot\!(-\vec{n}) = -s(\vec{n}\!\cdot\!\vec{v}) + s(\vec{v}\!\cdot\!\vec{n}) + (\vec{n}\!\times\!\vec{v})\!\cdot\!\vec{n}
$$

其中前两项相消（$\vec{n}\!\cdot\!\vec{v}=\vec{v}\!\cdot\!\vec{n}$），且 $(\vec{n}\!\times\!\vec{v})\!\cdot\!\vec{n}=0$（叉积垂直于两因子），所以 $w'=0$。**结果仍是纯四元数**。

**向量部分**：

$$
\vec{v}' = w_1(-\vec{n}) + s\,\vec{u} + \vec{u}\!\times\!(-\vec{n})
$$

代入 $w_1=-\vec{n}\!\cdot\!\vec{v}$、$\vec{u}=s\vec{v}+\vec{n}\!\times\!\vec{v}$：

$$
\vec{v}' = (\vec{n}\!\cdot\!\vec{v})\vec{n} + s(s\vec{v}+\vec{n}\!\times\!\vec{v}) - s(\vec{v}\!\times\!\vec{n}) - (\vec{n}\!\times\!\vec{v})\!\times\!\vec{n}
$$

利用 $\vec{v}\!\times\!\vec{n}=-\vec{n}\!\times\!\vec{v}$，以及叉积展开恒等式 $(\vec{n}\!\times\!\vec{v})\!\times\!\vec{n}=\vec{v}(\vec{n}\!\cdot\!\vec{n})-\vec{n}(\vec{v}\!\cdot\!\vec{n})=\|\vec{n}\|^2\vec{v}-(\vec{n}\!\cdot\!\vec{v})\vec{n}$：

$$
\begin{aligned}
\vec{v}' &= (\vec{n}\!\cdot\!\vec{v})\vec{n} + s^2\vec{v} + s(\vec{n}\!\times\!\vec{v}) + s(\vec{n}\!\times\!\vec{v}) - \|\vec{n}\|^2\vec{v} + (\vec{n}\!\cdot\!\vec{v})\vec{n} \\
&= 2(\vec{n}\!\cdot\!\vec{v})\vec{n} + (s^2-\|\vec{n}\|^2)\vec{v} + 2s(\vec{n}\!\times\!\vec{v})
\end{aligned}
$$

**第三步**：代回 $s=\cos\frac{\theta}{2}$，$\|\vec{n}\|^2=\sin^2\frac{\theta}{2}$，利用倍角公式：

- $s^2-\|\vec{n}\|^2=\cos^2\frac{\theta}{2}-\sin^2\frac{\theta}{2}=\cos\theta$
- $2(\vec{n}\!\cdot\!\vec{v})\vec{n}=2\sin^2\frac{\theta}{2}(\hat{a}\!\cdot\!\vec{v})\hat{a}=(1-\cos\theta)(\hat{a}\!\cdot\!\vec{v})\hat{a}$
- $2s(\vec{n}\!\times\!\vec{v})=2\cos\frac{\theta}{2}\sin\frac{\theta}{2}(\hat{a}\!\times\!\vec{v})=\sin\theta(\hat{a}\!\times\!\vec{v})$

最终：

$$
\boxed{\quad \vec{v}' = \cos\theta\,\vec{v} + (1-\cos\theta)(\hat{a}\!\cdot\!\vec{v})\hat{a} + \sin\theta\,(\hat{a}\!\times\!\vec{v}) \quad}
$$

这正是著名的 **Rodrigues 旋转公式**。证毕。结论：$v'=qvq^{-1}$ 确实实现了"绕 $\hat{a}$ 轴旋转 $\theta$"。

### 4.3 C++ 示例（`rotateVector`）

```cpp
template <typename T>
inline Vec3<T> rotateVector(const Quaternion<T>& q, const Vec3<T>& v);
// 内部: 把 v 包装成纯四元数 (v.x,v.y,v.z,0)，计算 qn * vq * qn.inverse()，
//       qn 是 q 的归一化版本（保证单位长度）。返回结果向量部分。
```

```cpp
// 绕 Z 轴 +90°：X 轴单位向量 → Y 轴单位向量
Quatf rotZ90 = fromAxisAngle(Vec3f(0,0,1), float(M_PI)/2.0f);
Vec3f r = rotateVector(rotZ90, Vec3f(1,0,0));   // ≈ (0,1,0)

// 旋转保持长度
Vec3f r2 = rotateVector(rotZ90, Vec3f(2,0,0));
// r2.length() == 2
```

> 对比直接用矩阵：$v' = R\,v$。四元数版本省去矩阵构造、且保长保角（因为 $q^{-1}$ 把 $q$ 引入的缩放又抵消回去）。

***

## 5. 四元数插值

动画与相机过渡需要在两个朝向 $q_0,q_1$ 之间平滑插值。有三种方法，质量从低到高。

### 5.1 LERP（线性插值）

$$
\mathrm{lerp}(q_0,q_1,t) = (1-t)\,q_0 + t\,q_1
$$

- 优点：最便宜。
- 缺点：① 结果不是单位四元数（需要额外归一化）；② **角速度不均匀**（中间快、两端慢，类似 OpenGL 的 `glOrtho` 般的不均匀）。

### 5.2 NLERP（Normalized LERP）

$$
\mathrm{nlerp}(q_0,q_1,t) = \frac{(1-t)q_0+t\,q_1}{\|(1-t)q_0+t\,q_1\|}
$$

- 即 LERP 后再归一化，把结果"拉回"单位球面。
- 优点：便宜，结果在单位球上，**对大部分动画足够好**。
- 缺点：角速度仍**不严格均匀**（沿弦线性插值再投影到球面，弧长并非 $t$ 的线性函数）。当两四元数夹角较小时，误差可忽略。

### 5.3 SLERP（球面线性插值）—— 重点

#### 5.3.1 目标

在 4D 单位超球面上，沿 $q_0$ 到 $q_1$ 的**大圆弧**做**匀角速度**插值，即插值点与 $q_0$ 的夹角随 $t$ 线性增长：$\phi(t)=t\theta$，其中 $\theta$ 是 $q_0,q_1$ 的夹角。

#### 5.3.2 几何推导

把四元数当作 4D 向量，两单位四元数的夹角 $\theta$ 由内积给出：

$$
\cos\theta = q_0\cdot q_1 = w_0 w_1 + x_0 x_1 + y_0 y_1 + z_0 z_1
$$

$q_0,q_1$ 张成一张二维平面。在此平面内取一组**正交基** $\{q_0,\ \hat{q}_\perp\}$，其中

$$
q_\perp = q_1 - (q_1\!\cdot\!q_0)\,q_0 = q_1 - \cos\theta\,q_0
$$

是 $q_1$ 减去其在 $q_0$ 方向投影后的"垂直分量"，其模长 $\|q_\perp\|=\sin\theta$，故 $\hat{q}_\perp = q_\perp/\sin\theta$。

在这组正交基下，从 $q_0$ 出发转角度 $\phi$ 的点为

$$
p(\phi) = \cos\phi\,q_0 + \sin\phi\,\hat{q}_\perp
$$

令 $\phi=t\theta$，并代回 $\hat{q}_\perp=(q_1-\cos\theta\,q_0)/\sin\theta$：

$$
\begin{aligned}
\mathrm{slerp} &= \cos(t\theta)\,q_0 + \frac{\sin(t\theta)}{\sin\theta}(q_1-\cos\theta\,q_0) \\
&= \left(\cos(t\theta)-\frac{\sin(t\theta)\cos\theta}{\sin\theta}\right)q_0 + \frac{\sin(t\theta)}{\sin\theta}\,q_1
\end{aligned}
$$

合并 $q_0$ 的系数（利用 $\cos(t\theta)\sin\theta - \sin(t\theta)\cos\theta = \sin(\theta-t\theta)=\sin((1-t)\theta)$）：

$$
\boxed{\quad \mathrm{slerp}(q_0,q_1,t) = \frac{\sin((1-t)\theta)}{\sin\theta}\,q_0 + \frac{\sin(t\theta)}{\sin\theta}\,q_1 \quad}
$$

性质：$t=0$ 得 $q_0$，$t=1$ 得 $q_1$，且任意时刻结果都在大圆弧上、模长恒为 1、角速度恒定。

#### 5.3.3 最短弧处理（取负）

因为 $q$ 与 $-q$ 表示同一旋转，但它们在 4D 球面上是**对跖点**。若直接对 $q_0,q_1$ 求 SLERP，当 $\cos\theta<0$（夹角 $>90°$）时会绕远路。所以约定：**若** **$\cos\theta<0$，把** **$q_1$** **换成** **$-q_1$**（表示同一旋转但走短弧），再令 $\cos\theta\leftarrow -\cos\theta$。

#### 5.3.4 接近时退化到 LERP

当 $\theta\to 0$ 时 $\sin\theta\to 0$，公式出现 $0/0$ 的数值病态。工程处理：当 $\cos\theta>0.9995$（即 $\theta<\sim 1.8°$）时直接用 NLERP，误差可忽略且避免除零。这正是 `slerp` 实现的做法。

### 5.4 C++ 示例（`slerp`）

```cpp
template <typename T>
inline Quaternion<T> slerp(const Quaternion<T>& q0, const Quaternion<T>& q1, T t);
// 内部步骤：
//   1. 归一化 q0,q1 → a,b
//   2. cosθ = a·b；若 cosθ<0 则 b←-b，cosθ←-cosθ （最短弧）
//   3. 若 cosθ>0.9995 退化到 NLERP（避免除零）
//   4. 否则按 slerp 公式计算
```

```cpp
Quatf A = fromAxisAngle(Vec3f(0,0,1), float(M_PI)/2);  // 90°
Quatf B = fromAxisAngle(Vec3f(0,0,1), 0.5236f);         // 30°

Quatf r0 = slerp(A, B, 0.0f);  // == A.normalized()
Quatf r1 = slerp(A, B, 1.0f);  // == B.normalized()
Quatf rt = slerp(A, B, 0.37f); // 中间值，且仍是单位四元数
```

#### 三种方法对比

| 方法    | 结果是否单位 |  角速度均匀 |       成本      | 适用           |
| ----- | :----: | :----: | :-----------: | ------------ |
| LERP  |    否   |    否   |       最低      | 一般不用         |
| NLERP |    是   |   近似   |       低       | 动画、相机过渡（夹角小） |
| SLERP |    是   | **精确** | 中（含 sin/acos） | 精确旋转链、关键帧插值  |

***

## 6. 四元数 vs 欧拉角

### 6.1 欧拉角（Euler Angles）

用三个独立角度 $(\alpha,\beta,\gamma)$ 描述姿态，依次绕选定坐标轴旋转。常见约定有 **ZYX（Yaw-Pitch-Roll）**、**XYZ** 等。本项目 `fromEulerXYZ(rx,ry,rz)` 采用 XYZ 顺序（列向量约定，合成 $q_x q_y q_z$，对应"先 $R_z$ 再 $R_y$ 再 $R_x$"）：

$$
q = q_x\,q_y\,q_z,\qquad q_x=\text{fromAxisAngle}((1,0,0),\,r_x),\ \ldots
$$

```cpp
Quatf q = fromEulerXYZ(rx, ry, rz);
```

欧拉角的优点是**直观**（人脑容易理解"偏航/俯仰/翻滚"），常用于编辑器 UI、相机控制输入。

### 6.2 万向节死锁（Gimbal Lock）

按固定轴序旋转时，若**中间那次旋转达到** **$\pm 90°$**，第一和第三次旋转的旋转轴会重合，丢失一个自由度。

以 ZYX（Yaw-$Z$ → Pitch-$Y$ → Roll-$X$）为例：

- 当 Pitch（绕 $Y$）$=\pm 90°$ 时，原本的 $Z$ 轴经旋转后落到了 $X$ 轴上；
- 此时 Yaw（绕 $Z$）和 Roll（绕 $X$）的作用轴共线，**两者只能合成一个旋转**；
- 于是 3 个参数只能描述 2 个独立旋转——这就是"死锁"。

直观比喻：三个嵌套的万向节环，当中间环转 90° 时内外两环共面，再转动外环和内环效果一样，系统"卡住"一个维度。

**后果**：在死锁点附近插值会出现剧烈抖动、导数奇异，无法平滑过渡。这是欧拉角用于动画/插值时的致命缺陷。

### 6.3 四元数的优势

| 优势         | 说明                                            |
| ---------- | --------------------------------------------- |
| **无万向节死锁** | 用 4 个参数描述 SO(3)（3 自由度），多出的 1 维恰好规避了三参数表示的拓扑奇点 |
| **插值平滑**   | SLERP 在球面上匀角速度，欧拉角三轴独立 LERP 会扭曲路径             |
| **合成简单**   | 两次旋转合并只需 $q_1 q_2$（一次四元数乘法），矩阵合并要 64 次乘加      |
| **数值稳定**   | 单位四元数相乘仍是单位四元数（积性），矩阵多次相乘易累积正交性误差             |
| **存储紧凑**   | 仅 4 个浮点数；旋转矩阵要 9 个                            |

### 6.4 对比表

| 维度          | 欧拉角           | 四元数                 | 旋转矩阵       |
| ----------- | ------------- | ------------------- | ---------- |
| **存储**      | 3 个数（最省）      | 4 个数                | 9 个数       |
| **表示唯一性**   | 唯一（给定轴序）      | 不唯一（$q$ 与 $-q$ 同旋转） | 唯一         |
| **可读性**     | ★★★★★ 直观      | ★★ 需换算              | ★ 难读       |
| **旋转合成**    | 难（要转矩阵）       | 容易（$q_1 q_2$）       | 中（矩阵乘）     |
| **插值质量**    | 差（易扭曲）        | ★★★★★（SLERP）        | 差          |
| **奇异性**     | 有 Gimbal Lock | 无                   | 无（但数值漂移）   |
| **数值稳定性**   | 一般            | 好（单位性可保持）           | 一般（正交性易漂移） |
| **GPU/着色器** | 少用            | 常用                  | 最常用        |

> 经验法则：**人机交互**用欧拉角（输入），**内部计算与存储**用四元数，**顶点变换**转成矩阵（GPU 友好）。

***

## 7. 四元数 ↔ 旋转矩阵

### 7.1 四元数 → 旋转矩阵（`toMatrix`）

设 $q=(x,y,z,w)$ 为**单位**四元数，对应的 $3\times3$（本项目扩展为 $4\times4$）旋转矩阵为

$$
R = \begin{bmatrix}
1-2(y^2+z^2) & 2(xy-wz)      & 2(xz+wy)      \\
2(xy+wz)     & 1-2(x^2+z^2)  & 2(yz-wx)      \\
2(xz-wy)     & 2(yz+wx)      & 1-2(x^2+y^2)
\end{bmatrix}
$$

由来：把 $v'=qvq^{-1}$ 展开成 $\vec{v}'=R\vec{v}$，逐项收集 $\vec{v}$ 各分量的系数即得上式。本项目实现中先归一化 $q$，再按上式填入 `Matrix4`（列主序，仅含旋转，无平移/缩放）。

```cpp
template <typename T>
inline Matrix4<T> toMatrix(const Quaternion<T>& q);
```

```cpp
Quatf rotZ90 = fromAxisAngle(Vec3f(0,0,1), float(M_PI)/2);
Matrix4f M = toMatrix(rotZ90);
Vec3f r = M.transformDirection(Vec3f(1,0,0)); // ≈ (0,1,0)
```

### 7.2 旋转矩阵 → 四元数（`fromMatrix`，Shepperd 分支法）

直接由矩阵元素反解 $x,y,z,w$ 时，若只用 $\text{trace}$ 求解，在某些姿态下除数过小、数值误差大。**Shepperd 方法**通过比较矩阵对角元和迹，**选择最大的那个分量**作为先求对象，从而保证除数最大、精度最高。四个分支：

$$
\begin{cases}
\text{若 }\mathrm{tr}=m_{00}+m_{11}+m_{22}>0: & S=4w=\sqrt{\mathrm{tr}+1}\cdot2,\ \ w=\tfrac{S}{4},\ x=\tfrac{m_{21}-m_{12}}{S},\ y=\tfrac{m_{02}-m_{20}}{S},\ z=\tfrac{m_{10}-m_{01}}{S} \\[4pt]
\text{若 }m_{00}\text{ 最大}: & S=4x,\ x=\tfrac{S}{4},\ y=\tfrac{m_{01}+m_{10}}{S},\ z=\tfrac{m_{02}+m_{20}}{S},\ w=\tfrac{m_{21}-m_{12}}{S} \\[4pt]
\text{若 }m_{11}\text{ 最大}: & S=4y,\ \ldots \\[4pt]
\text{若 }m_{22}\text{ 最大}: & S=4z,\ \ldots
\end{cases}
$$

> 其中 $m_{ij}=R[i][j]$。核心思想：先算"最大的那个分量"（保证分母大），其余分量通过非对角元的和差除以 $S$ 得到。这样在任何姿态下都数值稳定，是工业界标准做法。

```cpp
template <typename T>
inline Quaternion<T> fromMatrix(const Matrix4<T>& mat);
```

```cpp
Matrix4f M = toMatrix(rotZ90);
Quatf back = fromMatrix(M);                       // 往返：矩阵→四元数
Vec3f bv = rotateVector(back, Vec3f(1,0,0));       // ≈ (0,1,0)，与原旋转一致
```

### 7.3 互转的应用链

- **存储/网络传输**：存四元数（4 个 float）。
- **每帧动画/物理**：用四元数合成、SLERP。
- **提交给渲染管线**：`toMatrix` 转成 `mat4`，乘入 MVP。
- **从 DCC 软件/物理引擎读回**：常是矩阵，用 `fromMatrix` 转回四元数。

***

## 8. 面试速记

### 核心公式一张表

| 内容          | 公式                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| 定义          | $q=w+xi+yj+zk=(w,\vec{v})$，$i^2=j^2=k^2=ijk=-1$                                                              |
| Grassmann 积 | $(w_1w_2-\vec{v}_1\!\cdot\!\vec{v}_2,\ w_1\vec{v}_2+w_2\vec{v}_1+\vec{v}_1\!\times\!\vec{v}_2)$              |
| 共轭          | $q^*=(-x,-y,-z,w)$                                                                                           |
| 范数          | $\|q\|=\sqrt{w^2+x^2+y^2+z^2}$，且 $\|q_1 q_2\|=\|q_1\|\|q_2\|$                                                |
| 逆           | $q^{-1}=q^*/\|q\|^2$；**单位四元数逆=共轭**                                                                           |
| 轴-角→四元数     | $q=(\sin\frac{\theta}{2}\hat{a},\ \cos\frac{\theta}{2})$                                                     |
| 旋转向量        | $p'=q\,p\,q^{-1}$（$p=(0,\vec{v})$），等价 Rodrigues 公式                                                           |
| SLERP       | $\dfrac{\sin((1-t)\theta)}{\sin\theta}q_0+\dfrac{\sin(t\theta)}{\sin\theta}q_1$，$\cos\theta=q_0\!\cdot\!q_1$ |

### 必背要点

1. **存储** **$(x,y,z,w)$**，$w$ 是标量部分；本项目 Hamilton 约定。
2. **乘法不可交换**；$q_1 q_2$ 表示"先 $q_2$ 后 $q_1$"（与矩阵列向量约定一致）。
3. **单位四元数逆=共轭**——这是图形学最常用的优化。
4. **$q$** **与** **$-q$** **表示同一旋转**（双覆盖）→ SLERP 要判 $\cos\theta<0$ 取负走最短弧。
5. **$v'=qvq^{-1}$** 推导终点是 Rodrigues 公式，证伪"四元数是玄学"。
6. **SLERP** 在 $\theta\to0$ 时退化到 NLERP 防除零。
7. **欧拉角有 Gimbal Lock，四元数没有**——这是四元数最大的存在意义。
8. **矩阵→四元数用 Shepperd 分支法**保证数值稳定（选最大对角元先算）。

### 四元数 vs 欧拉角 对比表

| 维度    | 欧拉角                | 四元数               |
| ----- | ------------------ | ----------------- |
| 存储    | 3 数（省）             | 4 数               |
| 可读性   | 直观（Yaw/Pitch/Roll） | 需换算               |
| 合成    | 难                  | $q_1 q_2$，一次乘法    |
| 插值    | 易扭曲、不匀速            | SLERP 匀角速度        |
| 奇异性   | **有 Gimbal Lock**  | **无**             |
| 数值稳定性 | 一般                 | 好（单位性可保持）         |
| 表示唯一性 | 唯一                 | $q\equiv -q$（二选一） |

### 常见面试问答

- **Q：为什么用四元数而不是矩阵？**
  A：省存储（4 vs 9）、无 Gimbal Lock、插值平滑（SLERP）、合成快、数值稳定（单位性可保持）。矩阵主要用于最终顶点变换。
- **Q：为什么** **$qvq^{-1}$** **用半角？**
  A：$q$ 贡献 $\theta/2$，$q^{-1}$（共轭）又把世界"反转"半角，两次作用叠加才得到完整 $\theta$。从推导看，最终化简出的是 $\cos\theta,\sin\theta$ 的 Rodrigues 公式。
- **Q：SLERP 为什么要判断** **$\cos\theta<0$？**
  A：因为 $q$ 和 $-q$ 是同一旋转，但在 4D 球面上是对跖点；若不取负会走长弧（绕远路），动画表现为"转一大圈才到"。
- **Q：Gimbal Lock 本质是什么？**
  A：三个欧拉角到 SO(3) 的映射在 Pitch=$\pm90°$ 处雅可比秩亏（参数化空间的拓扑奇点），并非物理限制。四元数用 4 参数表示 3 自由度，恰好绕开了这个奇点。

***

