import { afterEach, describe, expect, it, vi } from 'vitest';
import { reviewIntake, sanitizeFindings } from './intakeReview';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const finding = (patch: Record<string, unknown> = {}) => ({
  field: 'body',
  kind: 'personal-attack',
  reason: '인격을 평가하는 표현으로 읽혀요.',
  rewritten: '회의가 자주 길어져 다른 일정에 영향을 줍니다.',
  ...patch,
});

describe('sanitizeFindings', () => {
  it('정상 항목은 그대로 통과시킨다', () => {
    expect(sanitizeFindings([finding()])).toHaveLength(1);
  });

  it('배열이 아니면 빈 배열이다', () => {
    expect(sanitizeFindings(null)).toEqual([]);
    expect(sanitizeFindings({ findings: [] })).toEqual([]);
  });

  it('field 가 세 값 중 하나가 아니면 버린다', () => {
    expect(sanitizeFindings([finding({ field: 'summary' })])).toEqual([]);
    expect(sanitizeFindings([finding({ field: 123 })])).toEqual([]);
  });

  it('rewritten 이 비어 있으면 버린다', () => {
    expect(sanitizeFindings([finding({ rewritten: '   ' })])).toEqual([]);
    expect(sanitizeFindings([finding({ rewritten: undefined })])).toEqual([]);
  });

  it('kind 가 모르는 값이면 안전한 쪽(personal-attack)으로 강등한다', () => {
    const [item] = sanitizeFindings([finding({ kind: 'style' })]);
    expect(item.kind).toBe('personal-attack');
  });

  it('profanity 는 그대로 유지한다', () => {
    const [item] = sanitizeFindings([finding({ kind: 'profanity' })]);
    expect(item.kind).toBe('profanity');
  });

  it('reason 이 없어도 항목을 버리지 않는다', () => {
    const [item] = sanitizeFindings([finding({ reason: undefined })]);
    expect(item.reason).toBe('');
  });
});

describe('reviewIntake', () => {
  const input = { title: '제목', body: '본문', expectedChange: '' };

  it('엔드포인트가 없으면 disabled 를 돌려준다', async () => {
    vi.stubEnv('VITE_REVIEW_ENDPOINT', '');
    const result = await reviewIntake(input);
    expect(result).toEqual({ ok: false, reason: 'disabled' });
  });

  it('성공하면 정제된 findings 를 돌려준다', async () => {
    vi.stubEnv('VITE_REVIEW_ENDPOINT', 'http://localhost/api/review');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ ok: true, findings: [finding(), finding({ field: 'nope' })] }),
    })));
    const result = await reviewIntake(input);
    expect(result.ok).toBe(true);
    expect(result.findings).toHaveLength(1);
  });

  it('지적이 없으면 ok:true 에 빈 배열이다', async () => {
    vi.stubEnv('VITE_REVIEW_ENDPOINT', 'http://localhost/api/review');
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ ok: true, findings: [] }) })));
    const result = await reviewIntake(input);
    expect(result).toEqual({ ok: true, findings: [] });
  });

  it('실패하면 한 번 재시도하고, 재시도가 성공하면 그 결과를 쓴다', async () => {
    vi.stubEnv('VITE_REVIEW_ENDPOINT', 'http://localhost/api/review');
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ json: async () => ({ ok: true, findings: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    const result = await reviewIntake(input);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it('응답이 JSON이 아니면 ok:false 다', async () => {
    vi.stubEnv('VITE_REVIEW_ENDPOINT', 'http://localhost/api/review');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => {
        throw new Error('not json');
      },
    })));
    const result = await reviewIntake(input);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('bad json');
  });

  it('두 번 다 실패하면 ok:false 다', async () => {
    vi.stubEnv('VITE_REVIEW_ENDPOINT', 'http://localhost/api/review');
    const fetchMock = vi.fn().mockRejectedValue(new Error('network'));
    vi.stubGlobal('fetch', fetchMock);
    const result = await reviewIntake(input);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
  });

  it('접수자 정보를 요청 본문에 넣지 않는다', async () => {
    vi.stubEnv('VITE_REVIEW_ENDPOINT', 'http://localhost/api/review');
    // 호출 인자 타입을 명시해야 mock.calls의 튜플 타입이 [string, RequestInit]로 좁혀진다.
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({
      json: async () => ({ ok: true, findings: [] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    await reviewIntake({ title: '제목', body: '본문', expectedChange: '기대' });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(Object.keys(sent).sort()).toEqual(['body', 'expectedChange', 'title']);
  });
});
