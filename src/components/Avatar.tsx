import { profiles } from '../data/mockData';
import type { Profile } from '../types';

// 이름 → 프로필(색상·사진) 조회. 사진 있으면 <img>, 없으면 이니셜 칩으로 폴백.
const byName = new Map(profiles.map((profile) => [profile.name, profile]));

type AvatarProps = {
  name: string;
  color?: Profile['color']; // 조뽑기 등 프로필 색과 다른 색을 강제할 때만 전달.
  className?: string;
};

export function Avatar({ name, color, className }: AvatarProps) {
  const profile = byName.get(name);
  const tone = color ?? profile?.color ?? 'blue';
  const cls = `tiny-avatar ${tone}${className ? ` ${className}` : ''}`;
  if (profile?.photoUrl) {
    return (
      <span className={cls}>
        <img src={profile.photoUrl} alt="" />
      </span>
    );
  }
  return <span className={cls}>{name.slice(0, 1)}</span>;
}
