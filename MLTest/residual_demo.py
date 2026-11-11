"""残差（Residual）最小可运行示例。

配套笔记：MLBaseLearning/4深度学习/4-1残差.md

三个部分：
  1. 回归残差：验证 e 均值为 0、X^T e = 0（正规方程）
  2. 残差块梯度：手推反向传播 + 数值梯度校验；演示恒等捷径把梯度"送回去"
  3. 提升法：每一轮拟合残差，MSE 单调下降

只依赖 numpy：  python3 residual_demo.py
"""

import numpy as np

rng = np.random.default_rng(0)


# ============================================================
# 1. 回归中的残差
# ============================================================
def demo_regression_residual():
    n, d = 200, 3
    X = rng.normal(size=(n, d))
    w_true = np.array([2.0, -1.0, 0.5])
    b_true = 1.5
    y = X @ w_true + b_true + rng.normal(scale=0.3, size=n)

    Xb = np.c_[np.ones(n), X]              # 设计矩阵：加一列 1 对应截距
    beta_hat, *_ = np.linalg.lstsq(Xb, y, rcond=None)
    y_hat = Xb @ beta_hat
    e = y - y_hat

    print("=" * 60)
    print("1. 回归残差  e = y - y_hat")
    print("=" * 60)
    print(f"估计参数 beta_hat = {np.round(beta_hat, 4)}")
    print(f"残差均值 mean(e)   = {e.mean():+.2e}   （含截距时应 ≈ 0）")
    print(f"X^T e 最大值       = {np.abs(Xb.T @ e).max():.2e}   （正规方程应 ≈ 0）")
    print(f"残差平方和 RSS     = {e @ e:.4f}")
    print(f"平均残差标准差     = {e.std():.4f}  （真噪声 σ=0.3）")
    print()


# ============================================================
# 2. 残差块与梯度高速公路
# ============================================================
def relu(z):
    return np.maximum(z, 0.0)


def block_forward(x, W1, W2):
    """out = W2 @ relu(W1 @ x) + x，返回中间量供反向传播使用。"""
    z = W1 @ x
    a = relu(z)
    F = W2 @ a
    out = F + x
    return out, (x, z, a, F)


def block_backward(dout, W1, W2, cache, use_shortcut=True):
    x, z, a, F = cache
    dF = dout
    dW2 = np.outer(dF, a)
    da = W2.T @ dF
    dz = da * (z > 0)
    dW1 = np.outer(dz, x)
    # 关键一步：x 同时被 F 和恒等捷径使用，所以梯度是两路之和
    dx = W1.T @ dz + (dout if use_shortcut else 0.0)
    return dx, dW1, dW2


def demo_residual_block_grad():
    d_in, d_hid = 3, 4
    W1 = rng.normal(scale=0.5, size=(d_hid, d_in))
    W2 = rng.normal(scale=0.5, size=(d_in, d_hid))
    x = rng.normal(size=d_in)
    t = rng.normal(size=d_in)              # 目标值

    def loss(W1_, W2_, use_shortcut=True):
        out, _ = block_forward(x, W1_, W2_)
        if not use_shortcut:
            out = out - x                  # 去掉捷径，确保对比时前向也一致
        return 0.5 * np.sum((out - t) ** 2)

    # 前向 + 反向
    out, cache = block_forward(x, W1, W2)
    dout = out - t
    dx, dW1, dW2 = block_backward(dout, W1, W2, cache)

    # 数值梯度校验 (dL/dW1, dL/dW2)
    def numeric_grad(param, idx):
        h = 1e-6
        old = param[idx]
        param[idx] = old + h
        lp = loss(W1, W2)
        param[idx] = old - h
        lm = loss(W1, W2)
        param[idx] = old
        return (lp - lm) / (2 * h)

    err = 0.0
    for idx in np.ndindex(W1.shape):
        err = max(err, abs(numeric_grad(W1, idx) - dW1[idx]))
    for idx in np.ndindex(W2.shape):
        err = max(err, abs(numeric_grad(W2, idx) - dW2[idx]))

    print("=" * 60)
    print("2. 残差块梯度  out = F(x) + x")
    print("=" * 60)
    print(f"前向 out        = {np.round(out, 4)}")
    print(f"损失 L          = {loss(W1, W2):.6f}")
    print(f"解析梯度 vs 数值梯度 最大误差 = {err:.2e}   （<1e-8 即可认为推导正确）")

    # 演示：当 F 几乎不起作用时，捷径仍把梯度传回去
    W1_tiny = W1 * 1e-2
    W2_tiny = W2 * 1e-2
    out2, cache2 = block_forward(x, W1_tiny, W2_tiny)
    dout2 = out2 - t
    dx_with, _, _ = block_backward(dout2, W1_tiny, W2_tiny, cache2, use_shortcut=True)
    dx_without, _, _ = block_backward(dout2, W1_tiny, W2_tiny, cache2, use_shortcut=False)
    print()
    print("把 F 的权重缩小 100 倍（模拟该残差块几乎不干活）：")
    print(f"  有捷径时 ||dL/dx|| = {np.linalg.norm(dx_with):.4e}")
    print(f"  无捷径时 ||dL/dx|| = {np.linalg.norm(dx_without):.4e}")
    print("  → 无捷径时梯度几乎消失；有捷径时它约等于 ||dL/dout||，梯度被直接带回。")
    print()


# ============================================================
# 3. 提升法：每轮拟合残差
# ============================================================
def demo_boosting_residual():
    n = 100
    x = rng.uniform(-3, 3, size=n)
    y = np.sin(x) + rng.normal(scale=0.1, size=n)

    Xb = np.c_[np.ones(n), x, x ** 2]      # 弱模型：二次多项式
    F = np.full(n, y.mean())               # 初始预测：均值常数
    lr = 0.3

    print("=" * 60)
    print("3. 提升法：h_m 拟合负梯度（平方损失下即残差）")
    print("=" * 60)
    mse = np.mean((y - F) ** 2)
    print(f"第 0 轮  MSE = {mse:.6f}")
    for m in range(1, 11):
        target = y - F                     # 残差（平方损失的负梯度）
        coef, *_ = np.linalg.lstsq(Xb, target, rcond=None)
        F = F + lr * (Xb @ coef)           # 只走一小步，模拟学习率
        mse = np.mean((y - F) ** 2)
        if m % 2 == 1:
            print(f"第 {m:2d} 轮 MSE = {mse:.6f}")
    print("  → 每轮都在拟合『当前残差』，MSE 单调下降。")


if __name__ == "__main__":
    demo_regression_residual()
    demo_residual_block_grad()
    demo_boosting_residual()
