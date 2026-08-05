/*
  커피뽑기·조뽑기의 3D 무대.

  두 연출이 공유하는 원칙 하나: 화면에서 도는 것은 익명의 도형이 아니라 **참여자 본인**이다.
  이름 없는 네모가 돌 때는 아무도 긴장하지 않는다. 내 이름이 섞여 돌다가 멈출 때
  비로소 뽑기가 된다. 그래서 모든 조각에 이름 텍스처를 입힌다.
*/
import * as THREE from 'three';
import { easeOutBack, easeOutCubic, makeLabelTexture, type DrawStageHandle, type StageContext } from './drawScene';

/** 무대가 매 프레임 읽어 가는 살아 있는 상태. 값이 바뀌어도 씬을 다시 만들지 않는다. */
export type DrawState = {
  phase: 'idle' | 'rolling' | 'done';
  /** 뽑기를 시작한 시각(초). 감속 곡선의 기준점. */
  startedAt: number;
  /** 커피뽑기 당첨자 이름. 없으면 아직 안 뽑힘. */
  winner?: string;
  /** 조뽑기 결과. 이름 → 조 번호(0부터). 비면 아직 안 섞임. */
  teamOf?: Record<string, number>;
  teamCount?: number;
};

export type Member = { name: string; color: string };

// 아바타 색 이름을 실제 색으로 옮긴다. 디자인 토큰과 같은 계열을 쓴다.
const COLOR_HEX: Record<string, string> = {
  green: '#3f6b52',
  blue: '#2f6fd0',
  red: '#c2553f',
  yellow: '#c08a2e',
};

const hexOf = (color: string) => COLOR_HEX[color] ?? '#2f6fd0';

/* 조 색. 결과 카드와 같은 순서로 돌려 써서 3D 에서 본 색과 목록의 조가 이어진다. */
const TEAM_HEX = ['#2f6fd0', '#3f6b52', '#c2553f', '#c08a2e', '#6b4fa8', '#2f8f8f'];

function makeTile(ctx: StageContext, label: string, hex: string) {
  const texture = ctx.track(makeLabelTexture(label, hex));
  // 190px 높이 캔버스에서 이름 한 글자가 읽히려면 이 정도는 되어야 한다.
  const geometry = ctx.track(new THREE.PlaneGeometry(1.6, 1.6));
  const material = ctx.track(
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }),
  );
  return new THREE.Mesh(geometry, material);
}

/*
  커피뽑기 — 가챠.
  참여자 캡슐이 원통을 이루며 돌다가, 뽑기가 시작되면 빨라지고,
  감속하면서 당첨자만 앞으로 튀어나온다. 나머지는 뒤로 물러나며 흐려진다.
*/
export function buildCoffeeStage(ctx: StageContext, state: () => DrawState, members: Member[]): DrawStageHandle {
  const group = new THREE.Group();
  ctx.scene.add(group);

  const radius = 2.3;
  const tiles = members.map((member, index) => {
    const tile = makeTile(ctx, member.name.slice(0, 1), hexOf(member.color));
    const angle = (index / Math.max(members.length, 1)) * Math.PI * 2;
    tile.userData = { angle, name: member.name };
    group.add(tile);
    return tile;
  });

  ctx.camera.position.set(0, 0, 6.2);

  return {
    update(elapsed) {
      const s = state();
      const since = Math.max(0, elapsed - s.startedAt);

      // 대기 중에는 천천히, 뽑는 동안에는 빠르게 돌다 3초에 걸쳐 멈춘다.
      let speed = 0.25;
      if (s.phase === 'rolling') speed = 5.5;
      else if (s.phase === 'done') speed = 0.25 + 4 * (1 - easeOutCubic(Math.min(since / 3, 1)));
      group.rotation.y += speed * 0.016;

      // 통 전체를 살짝 기울여 원통이 납작한 띠로 보이지 않게 한다.
      group.rotation.x = Math.sin(elapsed * 0.4) * 0.08 - 0.12;

      const reveal = s.phase === 'done' && s.winner ? easeOutBack(Math.min(since / 1.1, 1)) : 0;

      tiles.forEach((tile) => {
        const { angle, name } = tile.userData as { angle: number; name: string };
        const won = s.winner === name;
        // 당첨자는 궤도를 벗어나 카메라 앞으로 나온다.
        const pull = won ? reveal : 0;
        const r = radius * (1 - pull * 0.72);
        tile.position.set(Math.sin(angle) * r, Math.sin(angle * 3) * 0.35 * (1 - pull), Math.cos(angle) * r + pull * 3.4);
        const scale = won ? 1 + pull * 1.5 : 1 - reveal * 0.35;
        tile.scale.setScalar(scale);
        // 캡슐이 언제나 정면을 보게 한다. 그래야 이름이 읽힌다.
        tile.quaternion.copy(ctx.camera.quaternion);
        tile.quaternion.premultiply(group.quaternion.clone().invert());
        const material = tile.material as THREE.MeshBasicMaterial;
        material.opacity = won ? 1 : 1 - reveal * 0.75;
      });
    },
    dispose() {
      ctx.scene.remove(group);
    },
  };
}

/*
  조뽑기 — 카드 섞기.
  참여자 타일이 한데 뒤섞여 돌다가, 결과가 나오면 조별 색으로 바뀌며
  각자의 자리로 날아가 무리를 이룬다. 3D 에서 본 색이 아래 결과 카드의 조와 같다.
*/
export function buildTeamStage(ctx: StageContext, state: () => DrawState, members: Member[]): DrawStageHandle {
  const group = new THREE.Group();
  ctx.scene.add(group);

  const tiles = members.map((member, index) => {
    const tile = makeTile(ctx, member.name.slice(0, 1), hexOf(member.color));
    // 섞이는 동안의 자리. 규칙 없이 흩어져야 '섞인다'로 읽힌다.
    const seed = (index * 2.399963) % (Math.PI * 2);
    tile.userData = { seed, name: member.name, index };
    group.add(tile);
    return tile;
  });

  ctx.camera.position.set(0, 0, 7.4);
  const target = new THREE.Vector3();

  return {
    update(elapsed) {
      const s = state();
      const since = Math.max(0, elapsed - s.startedAt);
      const settle = s.phase === 'done' && s.teamOf ? easeOutCubic(Math.min(since / 1.4, 1)) : 0;
      const churn = s.phase === 'rolling' ? 3.2 : 0.5;

      group.rotation.y = Math.sin(elapsed * 0.25) * 0.25;

      tiles.forEach((tile) => {
        const { seed, name, index } = tile.userData as { seed: number; name: string; index: number };

        // 섞이는 자리 — 서로 다른 주기로 도는 리사주 곡선이라 규칙이 눈에 안 띈다.
        const t = elapsed * churn;
        const sx = Math.sin(t * 0.7 + seed) * 2.7;
        const sy = Math.sin(t * 0.9 + seed * 1.7) * 1.4;
        const sz = Math.cos(t * 0.6 + seed) * 1.6;

        // 자리를 잡은 뒤 — 조별로 뭉친다.
        const team = s.teamOf?.[name] ?? 0;
        const count = Math.max(s.teamCount ?? 1, 1);
        const columns = Math.min(count, 3);
        const col = team % columns;
        const row = Math.floor(team / columns);
        const withinTeam = index % 4;
        const gx = (col - (columns - 1) / 2) * 2.9 + (withinTeam % 2) * 0.95 - 0.47;
        const gy = 1.2 - row * 2.4 - Math.floor(withinTeam / 2) * 1.05;

        target.set(sx + (gx - sx) * settle, sy + (gy - sy) * settle, sz * (1 - settle));
        tile.position.copy(target);
        tile.scale.setScalar(1 - settle * 0.28);
        tile.quaternion.copy(ctx.camera.quaternion);
        tile.quaternion.premultiply(group.quaternion.clone().invert());

        // 자리를 잡으면서 개인 색이 조 색으로 바뀐다 — 3D 와 결과 목록을 잇는 고리다.
        if (settle > 0) {
          const material = tile.material as THREE.MeshBasicMaterial;
          material.color.lerpColors(
            new THREE.Color('#ffffff'),
            new THREE.Color(TEAM_HEX[team % TEAM_HEX.length]),
            settle * 0.85,
          );
        }
      });
    },
    dispose() {
      ctx.scene.remove(group);
    },
  };
}
