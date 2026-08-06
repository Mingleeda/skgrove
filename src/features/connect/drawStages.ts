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

const SIZE = 1.5;
const THICKNESS = 0.26;

type TileParts = { body: THREE.MeshStandardMaterial; glyph: THREE.MeshStandardMaterial };

/*
  납작한 판이 아니라 두께가 있는 조각으로 만든다.
  판(PlaneGeometry)은 옆에서 보면 선 하나로 사라져, 3D 엔진을 쓰고도 스티커처럼 보였다.

  색과 글자를 분리한다. 이름을 텍스처 배경째 구워 넣으면 그 색이 재질색과 곱해져,
  조뽑기에서 조 색으로 갈아탈 때 개인 색이 섞인 흙빛이 나왔다. 몸통은 단색 상자가
  갖고, 글자는 앞뒤에 얇게 띄운 투명 판이 갖는다 — 몸통 색은 마음대로 바뀌어도
  글자는 흰색 그대로 남는다.
*/
function makeTile(ctx: StageContext, label: string, hex: string) {
  const geometry = ctx.track(new THREE.BoxGeometry(SIZE, SIZE, THICKNESS));
  // 빛을 받는 재질을 쓴다. Basic 은 조명을 무시해서 어느 면이든 똑같이 평평했다.
  const body = ctx.track(new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.42, metalness: 0.05 }));
  const mesh = new THREE.Mesh(geometry, body);
  mesh.castShadow = true;

  const glyphTexture = ctx.track(makeLabelTexture(label));
  const glyphGeometry = ctx.track(new THREE.PlaneGeometry(SIZE, SIZE));
  // depthWrite 를 끈다 — 몸통 면과 사실상 같은 자리라 켜 두면 서로를 가려 글자가 깜빡인다.
  const glyph = ctx.track(
    new THREE.MeshStandardMaterial({ map: glyphTexture, transparent: true, depthWrite: false, roughness: 0.5 }),
  );

  const front = new THREE.Mesh(glyphGeometry, glyph);
  front.position.z = THICKNESS / 2 + 0.004;
  const back = new THREE.Mesh(glyphGeometry, glyph);
  back.position.z = -THICKNESS / 2 - 0.004;
  back.rotation.y = Math.PI;
  mesh.add(front, back);

  mesh.userData = { body, glyph } satisfies TileParts;
  return mesh;
}

/** 조각들이 떠 있는 것으로 보이게 받는 바닥. 그림자가 앉을 자리다. */
function makeFloor(ctx: StageContext, y: number) {
  const geometry = ctx.track(new THREE.PlaneGeometry(30, 30));
  const material = ctx.track(new THREE.ShadowMaterial({ opacity: 0.34 }));
  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y;
  floor.receiveShadow = true;
  return floor;
}

const partsOf = (mesh: THREE.Mesh) => mesh.userData as TileParts & Record<string, unknown>;

/*
  커피뽑기 — 가챠.
  참여자 캡슐이 원통을 이루며 돌다가, 뽑기가 시작되면 빨라지고,
  감속하면서 당첨자만 앞으로 튀어나온다. 나머지는 뒤로 물러나며 흐려진다.
*/
export function buildCoffeeStage(ctx: StageContext, state: () => DrawState, members: Member[]): DrawStageHandle {
  const group = new THREE.Group();
  ctx.scene.add(group);
  ctx.scene.add(makeFloor(ctx, -2.6));

  const radius = 2.3;
  const tiles = members.map((member, index) => {
    const tile = makeTile(ctx, member.name.slice(0, 1), hexOf(member.color));
    const angle = (index / Math.max(members.length, 1)) * Math.PI * 2;
    Object.assign(tile.userData, { angle, name: member.name, hex: hexOf(member.color) });
    group.add(tile);
    return tile;
  });

  // 매 프레임 새로 만들지 않는다 — 60fps × 조각 수만큼 쓰레기가 쌓인다.
  const orbit = new THREE.Vector3();
  const front = new THREE.Vector3();
  const spinQ = new THREE.Quaternion();
  const spinE = new THREE.Euler();

  return {
    /* 통(2.3)과 앞으로 튀어나온 당첨자(z 3.1 · 2.4배)가 둘 다 들어오는 값.
       구로 감싸 계산하면 실제 실루엣보다 넉넉해서 무대가 프레임의 절반만 쓴다 —
       원점에서 잰 4.9 대신, 화면에서 재 가며 조인 값이 이것이다. */
    fit: { radius: 3.4, elevation: 0.1, focusY: -0.1 },
    update(elapsed) {
      const s = state();
      const since = Math.max(0, elapsed - s.startedAt);

      const reveal = s.phase === 'done' && s.winner ? easeOutBack(Math.min(since / 1.1, 1)) : 0;

      /* 대기 중에는 천천히, 뽑는 동안에는 빠르게, 당첨이 드러나면 완전히 멈춘다.
         0.25 를 남겨 두면 결과가 나온 뒤에도 통이 계속 흘러 시선이 안 멎는다. */
      let speed = 0.25;
      if (s.phase === 'rolling') speed = 5.5;
      else if (s.phase === 'done') speed = 4.25 * (1 - easeOutCubic(Math.min(since / 2.4, 1)));
      group.rotation.y += speed * 0.016;
      group.rotation.x = Math.sin(elapsed * 0.4) * 0.06 * (1 - reveal) - 0.1 * (1 - reveal);

      // 빠를수록 진행 방향으로 늘린다. 잔상을 실제로 그리지 않고도 속도가 눈에 보인다.
      const smear = Math.min(speed / 5.5, 1);
      // 그룹이 도는 만큼을 되돌리는 회전. 당첨자를 통에서 꺼내 정면에 세울 때 쓴다.
      const unspin = group.quaternion.clone().invert();

      tiles.forEach((tile) => {
        const { angle, name, hex } = tile.userData as { angle: number; name: string; hex: string };
        const won = s.winner === name;
        const pull = won ? reveal : 0;
        const r = radius * (1 - pull * 0.72);
        orbit.set(Math.sin(angle) * r, Math.sin(angle * 3) * 0.3 * (1 - pull), Math.cos(angle) * r);

        /* 당첨자는 통과 함께 돌면 안 된다. 그룹 회전을 되돌린 자리로 보내야
           화면 한가운데 멎어 선다 — 안 그러면 커진 채로 계속 흘러간다. */
        front.set(0, 0.1, 3.1).applyQuaternion(unspin);
        tile.position.copy(orbit).lerp(front, pull);

        const grow = won ? 1 + pull * 1.45 : 1 - reveal * 0.35;
        // 당첨자는 늘리지 않는다 — 멈춰 선 것이 또렷해야 결과로 읽힌다.
        tile.scale.set(grow * (won ? 1 : 1 + smear * 0.55), grow, grow);

        // 조각이 제 축으로도 돈다. 두께가 있는 덕에 앞뒤가 번갈아 보이며 카드가 뒤집히는 느낌이 난다.
        spinQ.setFromEuler(spinE.set(0, elapsed * (0.8 + speed * 0.35) + angle, Math.sin(elapsed * 1.3 + angle) * 0.12));
        tile.quaternion.copy(spinQ).slerp(unspin, pull);

        const { body, glyph } = partsOf(tile);
        body.transparent = true;
        body.opacity = won ? 1 : 1 - reveal * 0.7;
        // 글자도 같이 흐려져야 한다. 몸통만 지우면 이름만 허공에 뜬다.
        glyph.opacity = body.opacity;
        /* 당첨자에게만 빛이 남는다. 발광색은 그 사람의 색이어야 한다 —
           고정색을 쓰면 빨강 아바타에 파란 빛이 더해져 엉뚱한 자홍색이 됐다. */
        body.emissive.set(won ? hex : '#000000');
        body.emissiveIntensity = won ? reveal * 0.3 : 0;
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
  ctx.scene.add(makeFloor(ctx, -3));

  const tiles = members.map((member, index) => {
    const tile = makeTile(ctx, member.name.slice(0, 1), hexOf(member.color));
    // 섞이는 동안의 자리. 규칙 없이 흩어져야 '섞인다'로 읽힌다.
    const seed = (index * 2.399963) % (Math.PI * 2);
    Object.assign(tile.userData, { seed, name: member.name, index, own: new THREE.Color(hexOf(member.color)) });
    group.add(tile);
    return tile;
  });

  const target = new THREE.Vector3();
  const teamColor = new THREE.Color();

  return {
    /* 섞이는 동안의 반경(2.7)보다 자리를 잡은 뒤의 격자(3열 ±3.4 · 2행)가 넓다.
       넓은 쪽에 맞춰 둬야 조가 늘어나도 바깥 조가 프레임에 걸리지 않는다. */
    fit: { radius: 4.4, elevation: 0.08, focusY: -0.4 },
    update(elapsed) {
      const s = state();
      const since = Math.max(0, elapsed - s.startedAt);
      const settle = s.phase === 'done' && s.teamOf ? easeOutCubic(Math.min(since / 1.4, 1)) : 0;
      const churn = s.phase === 'rolling' ? 3.2 : 0.5;
      const smear = s.phase === 'rolling' ? 1 - settle : 0;

      group.rotation.y = Math.sin(elapsed * 0.25) * 0.2;

      tiles.forEach((tile) => {
        const { seed, name, index, own } = tile.userData as {
          seed: number;
          name: string;
          index: number;
          own: THREE.Color;
        };

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
        const gx = (col - (columns - 1) / 2) * 2.9 + (withinTeam % 2) * 0.92 - 0.46;
        const gy = 1.1 - row * 2.3 - Math.floor(withinTeam / 2) * 1.02;

        target.set(sx + (gx - sx) * settle, sy + (gy - sy) * settle, sz * (1 - settle));
        tile.position.copy(target);

        const grow = 1 - settle * 0.28;
        tile.scale.set(grow * (1 + smear * 0.4), grow, grow);

        /* 섞이는 동안에는 제 축으로 구르고, 자리를 잡으면 정면으로 돌아온다.
           멈춘 뒤에도 계속 돌면 이름이 반쯤 가려 누가 몇 조인지 못 읽는다. */
        const spin = elapsed * (0.9 + churn * 0.5) + seed;
        tile.rotation.y = spin * (1 - settle);
        tile.rotation.x = Math.sin(spin * 0.6) * 0.3 * (1 - settle);

        /* 자리를 잡으면서 개인 색이 조 색으로 바뀐다 — 3D 와 결과 목록을 잇는 고리다.
           시작점은 그 사람의 색이어야 한다. 흰색에서 출발시켰더니 섞임이 끝나는
           순간 조각이 한 번 하얗게 번쩍였고, 끝점을 0.9 에 두어 조 색에 닿지도
           못했다 — 아래 결과 카드와 같은 색으로 멎어야 두 화면이 이어진다. */
        teamColor.set(TEAM_HEX[team % TEAM_HEX.length]);
        partsOf(tile).body.color.lerpColors(own, teamColor, settle);
      });
    },
    dispose() {
      ctx.scene.remove(group);
    },
  };
}
