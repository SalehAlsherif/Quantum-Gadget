export interface Complex {
  re: number;
  im: number;
}

export const C_ZERO: Complex = { re: 0, im: 0 };
export const C_ONE: Complex = { re: 1, im: 0 };
export const C_I: Complex = { re: 0, im: 1 };
export const C_MINUS_I: Complex = { re: 0, im: -1 };
export const INV_SQRT2: number = 1 / Math.SQRT2;

export function complex(re: number, im = 0): Complex {
  return { re, im };
}

export function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function cSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function cMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

export function cScale(a: Complex, s: number): Complex {
  return { re: a.re * s, im: a.im * s };
}

export function cDiv(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return { re: 0, im: 0 };
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

export function cConj(a: Complex): Complex {
  return { re: a.re, im: -a.im };
}

export function cMag(a: Complex): number {
  return Math.hypot(a.re, a.im);
}

export function cMagSq(a: Complex): number {
  return a.re * a.re + a.im * a.im;
}

export function cArg(a: Complex): number {
  return Math.atan2(a.im, a.re);
}

export function cPolar(r: number, theta: number): Complex {
  return {
    re: r * Math.cos(theta),
    im: r * Math.sin(theta),
  };
}

export function cEquals(a: Complex, b: Complex, eps = 1e-6): boolean {
  return Math.abs(a.re - b.re) < eps && Math.abs(a.im - b.im) < eps;
}

/**
 * Format complex numbers nicely into mathematical notation
 * e.g., "1/sqrt(2)", "0.707 + 0.707i", "1", "-i"
 */
export function formatComplex(c: Complex, precision = 3): string {
  const magSq = cMagSq(c);
  if (magSq < 1e-9) return "0";

  // Check for common exact values
  const re = c.re;
  const im = c.im;

  const isClose = (val: number, target: number) => Math.abs(val - target) < 1e-4;

  let reStr = "";
  let imStr = "";

  if (isClose(re, INV_SQRT2)) reStr = "1/√2";
  else if (isClose(re, -INV_SQRT2)) reStr = "-1/√2";
  else if (isClose(re, 0.5)) reStr = "1/2";
  else if (isClose(re, -0.5)) reStr = "-1/2";
  else if (isClose(re, 1)) reStr = "1";
  else if (isClose(re, -1)) reStr = "-1";
  else if (Math.abs(re) >= 1e-4) reStr = re.toFixed(precision).replace(/\.?0+$/, "");

  if (isClose(im, INV_SQRT2)) imStr = "1/√2 i";
  else if (isClose(im, -INV_SQRT2)) imStr = "-1/√2 i";
  else if (isClose(im, 0.5)) imStr = "1/2 i";
  else if (isClose(im, -0.5)) imStr = "-1/2 i";
  else if (isClose(im, 1)) imStr = "i";
  else if (isClose(im, -1)) imStr = "-i";
  else if (Math.abs(im) >= 1e-4) {
    const valStr = Math.abs(im).toFixed(precision).replace(/\.?0+$/, "");
    imStr = im > 0 ? `${valStr}i` : `-${valStr}i`;
  }

  if (!reStr && !imStr) return "0";
  if (reStr && !imStr) return reStr;
  if (!reStr && imStr) return imStr;
  return im > 0 ? `${reStr} + ${imStr}` : `${reStr} - ${imStr.replace("-", "")}`;
}
