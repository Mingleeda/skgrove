import { describe, expect, it } from 'vitest';
import {
  finalStatus,
  liveStatus,
  participationRate,
  quorumFor,
  remainingVoters,
  settleAgendas,
  votesShortOfQuorum,
} from './agendaRules';
import type { Agenda } from './types';

const TODAY = '2026-07-27';

const agenda = (patch: Partial<Agenda> = {}): Agenda => ({
  id: 'AGD-T',
  title: '테스트 안건',
  description: '',
  category: '회의문화',
  source: '직접 등록',
  part: '전체',
  author: '익명',
  authorName: '',
  approve: 0,
  reject: 0,
  status: '투표중',
  createdAt: '2026-07-20',
  eligibleCount: 30,
  deadline: '',
  closedAt: '',
  ...patch,
});

describe('quorumFor', () => {
  it('대상 인원의 1/3을 올림한 값', () => {
    expect(quorumFor(30)).toBe(10);
    expect(quorumFor(28)).toBe(10);
    expect(quorumFor(5)).toBe(2);
    expect(quorumFor(3)).toBe(1);
  });

  it('대상 인원이 없으면 0', () => {
    expect(quorumFor(0)).toBe(0);
  });
});

describe('liveStatus', () => {
  it('남은 전원이 반대해도 찬성이 많으면 조기 통과', () => {
    // 대상 5, 3:0 → 남은 2가 모두 반대해도 3 > 2
    expect(liveStatus(agenda({ approve: 3, reject: 0, eligibleCount: 5 }))).toBe('통과');
  });

  it('남은 표로 뒤집힐 수 있으면 계속 투표중', () => {
    // 대상 5, 2:0 → 남은 3이 모두 반대하면 2 < 3
    expect(liveStatus(agenda({ approve: 2, reject: 0, eligibleCount: 5 }))).toBe('투표중');
  });

  it('남은 전원이 찬성해도 과반이 안 되면 조기 부결', () => {
    // 대상 5, 0:3 → 남은 2가 모두 찬성해도 2 <= 3
    expect(liveStatus(agenda({ approve: 0, reject: 3, eligibleCount: 5 }))).toBe('부결');
  });

  it('아직 투표할 사람이 남았으면 과반이어도 닫지 않는다', () => {
    // 예전 구현은 '10표 이상 + 과반'이라 이 시점에 통과시켜 투표권을 뺏었다
    expect(liveStatus(agenda({ approve: 6, reject: 4, eligibleCount: 30 }))).toBe('투표중');
  });

  it('대상 인원 스냅샷이 없으면 남은 인원을 0으로 보고 즉시 판정한다', () => {
    expect(liveStatus(agenda({ approve: 1, reject: 0, eligibleCount: 0 }))).toBe('통과');
  });
});

describe('finalStatus', () => {
  it('정족수 미달이면 찬성이 많아도 부결', () => {
    // 대상 30 → 정족수 10인데 참여 6
    expect(finalStatus(agenda({ approve: 4, reject: 2, eligibleCount: 30 }))).toBe('부결');
  });

  it('정족수를 채우고 과반 찬성이면 통과', () => {
    expect(finalStatus(agenda({ approve: 8, reject: 4, eligibleCount: 30 }))).toBe('통과');
  });

  it('동수는 부결', () => {
    expect(finalStatus(agenda({ approve: 1, reject: 1, eligibleCount: 5 }))).toBe('부결');
  });
});

describe('settleAgendas', () => {
  it('마감일이 지난 안건을 닫고 최종 상태를 기록한다', () => {
    const [settled] = settleAgendas(
      [agenda({ approve: 3, reject: 8, eligibleCount: 30, deadline: '2026-07-01' })],
      TODAY,
    );

    expect(settled.status).toBe('부결');
    expect(settled.closedAt).toBe(TODAY);
  });

  it('마감 전이라도 이미 결과가 확정된 안건을 닫는다', () => {
    // 투표 이벤트에서만 상태를 갱신하면 이런 안건이 '투표중'으로 남는다
    const [settled] = settleAgendas(
      [agenda({ approve: 18, reject: 5, eligibleCount: 30, deadline: '2026-08-30' })],
      TODAY,
    );

    expect(settled.status).toBe('통과');
    expect(settled.closedAt).toBe(TODAY);
  });

  it('아직 뒤집힐 수 있는 안건은 건드리지 않고 배열 참조도 유지한다', () => {
    const input = [agenda({ approve: 2, reject: 1, eligibleCount: 30, deadline: '2026-08-30' })];
    expect(settleAgendas(input, TODAY)).toBe(input);
  });

  it('이미 닫힌 안건은 다시 닫지 않는다', () => {
    const input = [agenda({ status: '통과', closedAt: '2026-07-10', deadline: '2026-07-01' })];
    expect(settleAgendas(input, TODAY)).toBe(input);
  });
});

describe('집계 보조', () => {
  it('참여율은 대상 인원 대비 투표 수', () => {
    expect(participationRate(agenda({ approve: 18, reject: 5, eligibleCount: 30 }))).toBe(77);
  });

  it('대상 인원이 0이면 참여율은 0', () => {
    expect(participationRate(agenda({ approve: 3, reject: 0, eligibleCount: 0 }))).toBe(0);
  });

  it('집계가 대상 인원을 넘어도 남은 인원과 부족 표는 음수가 되지 않는다', () => {
    const overflow = agenda({ approve: 15, reject: 5, eligibleCount: 5 });
    expect(remainingVoters(overflow)).toBe(0);
    expect(votesShortOfQuorum(overflow)).toBe(0);
  });
});
