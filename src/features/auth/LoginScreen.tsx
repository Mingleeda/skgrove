import { FormEvent, useState } from 'react';
import { HeartHandshake, LogIn, ShieldCheck } from 'lucide-react';
import { teamParts, userRoles, isCompanyEmail } from '../../auth';
import type { CurrentUser, TeamPart, UserRole } from '../../types';

type LoginScreenProps = {
  onLogin: (user: CurrentUser) => void;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('팀원');
  const [part, setPart] = useState<TeamPart>('플랫폼파트');
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError('이름을 입력해주세요.');
      return;
    }

    if (!isCompanyEmail(trimmedEmail)) {
      setError('사내메일은 @sk.com 계정만 사용할 수 있어요.');
      return;
    }

    setError('');
    onLogin({ name: trimmedName, email: trimmedEmail, role, part });
  };

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand login-brand">
          <div className="brand-mark">
            <HeartHandshake size={24} />
          </div>
          <div>
            <strong>SK Grove</strong>
            <span>Team Culture Hub</span>
          </div>
        </div>
        <div>
          <p className="eyebrow">팀문화 개선 웹앱</p>
          <h1>팀 안에서 더 빨리 말하고, 함께 결정하고, 실제로 바꿔요</h1>
          <p>
            이름과 사내메일로 로그인한 뒤 소속 파트와 권한을 기준으로 의견 접수, 안건 투표, 리더 관리함을 사용할 수 있습니다.
          </p>
        </div>
        <div className="login-assurance">
          <ShieldCheck size={20} />
          익명 의견은 화면에서 작성자 정보와 분리되는 흐름으로 다룹니다.
        </div>
      </section>

      <form className="login-panel" onSubmit={submit}>
        <div>
          <p className="eyebrow">시작하기</p>
          <h2>사내 계정으로 로그인</h2>
        </div>

        <label>
          이름
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="이선민" />
        </label>

        <label>
          사내메일
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@sk.com"
          />
        </label>

        <label>
          소속 파트
          <select value={part} onChange={(event) => setPart(event.target.value as TeamPart)}>
            {teamParts.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          권한
          <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            {userRoles.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        {error && <p className="form-error">{error}</p>}

        <button className="primary-button wide" type="submit">
          <LogIn size={18} />
          로그인
        </button>
      </form>
    </main>
  );
}
