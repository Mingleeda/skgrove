import { describe, expect, it } from 'vitest';
import { normalizeTeamPart, teamParts } from './auth';

describe('파트 이름 정규화', () => {
  it("옛 이름 '혁신도구파트' 는 'PM혁신파트' 로 바뀐다", () => {
    // 실제 조직 이름이 PM혁신파트인데 앱에는 혁신도구파트로 들어가 있었다.
    // 코드만 고치면 이미 저장된 계정·안건·모임의 part 가 목록에 없는 값이 되어
    // 파트 필터와 파트지수에서 조용히 사라진다.
    expect(normalizeTeamPart('혁신도구파트')).toBe('PM혁신파트');
  });

  it('지금 쓰는 이름은 그대로 통과한다', () => {
    for (const part of teamParts) {
      expect(normalizeTeamPart(part)).toBe(part);
    }
    expect(normalizeTeamPart('전체')).toBe('전체');
  });

  it('값이 없으면 전체로 본다', () => {
    // 파트를 못 읽었다고 화면이 비면 안 된다. 가장 넓은 값으로 떨어뜨린다.
    expect(normalizeTeamPart(undefined)).toBe('전체');
    expect(normalizeTeamPart(null)).toBe('전체');
    expect(normalizeTeamPart('')).toBe('전체');
  });

  it('모르는 값은 임의로 바꾸지 않는다', () => {
    // 새 파트가 생겼는데 목록에 아직 없을 수 있다. 조용히 '전체'로 삼키면
    // 그 파트 사람들이 전부 전체 소속으로 뭉개진다.
    expect(normalizeTeamPart('신설파트')).toBe('신설파트');
  });

  it('파트 목록에 옛 이름이 남아 있지 않다', () => {
    expect(teamParts).not.toContain('혁신도구파트');
    expect(teamParts).toContain('PM혁신파트');
  });
});
