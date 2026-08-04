import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

// :root 블록은 토큰 정의처다. 하드코딩 검사에서 제외할 유일한 영역이다.
const rootStart = css.indexOf(':root {');
const rootEnd = css.indexOf('\n}', rootStart);
const outsideRoot = css.slice(0, rootStart) + css.slice(rootEnd);

// 래칫. 태스크가 진행될수록 낮춘다. 절대 올리지 않는다.
const MAX_HARDCODED_HEX = 776;
const MAX_HARDCODED_RGBA = 103;

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function token(name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`토큰 ${name} 을 :root 에서 찾지 못했다`);
  return match[1];
}

const SURFACES = ['--color-surface', '--color-page', '--color-sunken'];
const FOREGROUNDS = [
  '--color-ink',
  '--color-muted',
  '--color-moss',
  '--color-clay',
  '--color-danger',
  '--color-pending',
  '--color-info',
];

describe('디자인 토큰 대비', () => {
  // 색을 바꾸려는 사람이 이 테스트를 먼저 보게 한다.
  it.each(FOREGROUNDS)('%s 는 세 표면 모두에서 AA(4.5:1) 이상이다', (fg) => {
    for (const surface of SURFACES) {
      expect(contrast(token(fg), token(surface))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([
    ['--tint-moss-ink', '--tint-moss'],
    ['--tint-clay-ink', '--tint-clay'],
    ['--tint-danger-ink', '--tint-danger'],
    ['--tint-pending-ink', '--tint-pending'],
    ['--tint-info-ink', '--tint-info'],
  ])('%s / %s 배지 짝은 AAA(7:1) 이상이다', (ink, bg) => {
    expect(contrast(token(ink), token(bg))).toBeGreaterThanOrEqual(7);
  });
});

describe('토큰 경유율', () => {
  it('하드코딩 hex 는 상한을 넘지 않는다', () => {
    const found = outsideRoot.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(found.length).toBeLessThanOrEqual(MAX_HARDCODED_HEX);
  });

  it('하드코딩 rgb/rgba 는 상한을 넘지 않는다', () => {
    const found = outsideRoot.match(/rgba?\(/g) ?? [];
    expect(found.length).toBeLessThanOrEqual(MAX_HARDCODED_RGBA);
  });

  // 생김새 기준 토큰명은 다크모드 도입 시 의미가 깨진다.
  it('생김새 기준 토큰명을 쓰지 않는다', () => {
    expect(css).not.toMatch(/--color-shell/);
  });
});
