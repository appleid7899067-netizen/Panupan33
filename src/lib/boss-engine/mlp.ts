/**
 * MLP + Backprop — Neural Network from scratch
 * เรียนรู้รูปแบบที่ linear model ทำไม่ได้ (XOR) → พื้นฐาน Deep Learning
 */

export type MLPConfig = {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
  learningRate?: number;
};

export type MLP = {
  w1: number[][]; // hiddenSize x inputSize
  b1: number[];
  w2: number[][]; // outputSize x hiddenSize
  b2: number[];
  lr: number;
};

function randn(): number {
  // Box-Muller
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function xavier(rows: number, cols: number): number[][] {
  const scale = Math.sqrt(2 / (rows + cols));
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => randn() * scale),
  );
}

export function createMLP(cfg: MLPConfig): MLP {
  return {
    w1: xavier(cfg.hiddenSize, cfg.inputSize),
    b1: Array(cfg.hiddenSize).fill(0),
    w2: xavier(cfg.outputSize, cfg.hiddenSize),
    b2: Array(cfg.outputSize).fill(0),
    lr: cfg.learningRate ?? 0.5,
  };
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
}

function sigmoidPrimeFromY(y: number): number {
  return y * (1 - y);
}

export type ForwardResult = {
  h: number[]; // hidden activations
  y: number[]; // output activations
};

export function forward(mlp: MLP, x: number[]): ForwardResult {
  const h = mlp.w1.map((row, i) => {
    let s = mlp.b1[i];
    for (let j = 0; j < row.length; j++) s += row[j] * x[j];
    return sigmoid(s);
  });
  const y = mlp.w2.map((row, i) => {
    let s = mlp.b2[i];
    for (let j = 0; j < row.length; j++) s += row[j] * h[j];
    return sigmoid(s);
  });
  return { h, y };
}

/** One sample SGD step. Returns loss (MSE). */
export function trainStep(mlp: MLP, x: number[], target: number[]): number {
  const { h, y } = forward(mlp, x);
  // output delta
  const dy = y.map((yi, i) => (yi - target[i]) * sigmoidPrimeFromY(yi));
  // hidden delta
  const dh = h.map((hi, j) => {
    let s = 0;
    for (let i = 0; i < dy.length; i++) s += mlp.w2[i][j] * dy[i];
    return s * sigmoidPrimeFromY(hi);
  });
  // update w2, b2
  for (let i = 0; i < mlp.w2.length; i++) {
    for (let j = 0; j < mlp.w2[i].length; j++) {
      mlp.w2[i][j] -= mlp.lr * dy[i] * h[j];
    }
    mlp.b2[i] -= mlp.lr * dy[i];
  }
  // update w1, b1
  for (let i = 0; i < mlp.w1.length; i++) {
    for (let j = 0; j < mlp.w1[i].length; j++) {
      mlp.w1[i][j] -= mlp.lr * dh[i] * x[j];
    }
    mlp.b1[i] -= mlp.lr * dh[i];
  }
  let loss = 0;
  for (let i = 0; i < y.length; i++) loss += (y[i] - target[i]) ** 2;
  return loss / y.length;
}

export function trainEpoch(mlp: MLP, xs: number[][], ys: number[][]): number {
  let total = 0;
  const order = xs.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const idx of order) total += trainStep(mlp, xs[idx], ys[idx]);
  return total / Math.max(1, xs.length);
}

export function predict(mlp: MLP, x: number[]): number[] {
  return forward(mlp, x).y;
}

export function predictClass(mlp: MLP, x: number[], threshold = 0.5): number[] {
  return predict(mlp, x).map((v) => (v >= threshold ? 1 : 0));
}

/** Classic XOR dataset — linear model fails, MLP succeeds. */
export const XOR_DATA = {
  xs: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  ys: [[0], [1], [1], [0]],
};

export function trainXorDemo(epochs = 2000, hiddenSize = 4, lr = 0.8): {
  mlp: MLP;
  finalLoss: number;
  accuracy: number;
  predictions: Array<{ x: number[]; y: number[]; pred: number[] }>;
} {
  const mlp = createMLP({ inputSize: 2, hiddenSize, outputSize: 1, learningRate: lr });
  let loss = 0;
  for (let e = 0; e < epochs; e++) {
    loss = trainEpoch(mlp, XOR_DATA.xs, XOR_DATA.ys);
  }
  const predictions = XOR_DATA.xs.map((x, i) => ({
    x,
    y: XOR_DATA.ys[i],
    pred: predict(mlp, x),
  }));
  let correct = 0;
  for (const p of predictions) {
    if ((p.pred[0] >= 0.5 ? 1 : 0) === p.y[0]) correct++;
  }
  return {
    mlp,
    finalLoss: loss,
    accuracy: correct / predictions.length,
    predictions,
  };
}
