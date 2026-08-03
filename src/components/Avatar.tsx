import { useContext } from 'react';
import { ProfilesContext } from '../profilesContext';
import type { Profile } from '../types';

// 이름 → 라이브 아바타(색·사진) 조회. 사진 있으면 <img>, 없으면 이니셜 칩으로 폴백.
// 색은 성향 프로필, 사진은 계정에서 오며 App이 ProfilesContext로 합쳐 제공하므로
// 사진 변경이 전역에 즉시 반영된다.
type AvatarProps = {
  name: string;
  color?: Profile['color']; // 조뽑기 등 프로필 색과 다른 색을 강제할 때만 전달.
  className?: string;
};

export function Avatar({ name, color, className }: AvatarProps) {
  const directory = useContext(ProfilesContext);
  const info = directory.get(name);
  const tone = color ?? info?.color ?? 'blue';
  const cls = `tiny-avatar ${tone}${className ? ` ${className}` : ''}`;
  if (info?.photoUrl) {
    return (
      <span className={cls}>
        <img src={info.photoUrl} alt="" />
      </span>
    );
  }
  return <span className={cls}>{name.slice(0, 1)}</span>;
}
