import { FormEvent, useState } from 'react';
import { HeartHandshake, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { seedAccounts } from '../../accountStore';
import { teamParts, userRoles, isCompanyEmail } from '../../auth';
import type { CurrentUser, ManagedAccount, TeamPart, UserRole } from '../../types';

const toCurrentUser = (account: ManagedAccount): CurrentUser => ({
  name: account.name,
  email: account.email,
  role: account.role,
  part: account.part,
});
const quickLeader = seedAccounts.find((account) => account.name === '이선민');
const quickMember = seedAccounts.find((account) => account.name === '이두민');

type LoginScreenProps = {
  accounts: ManagedAccount[];
  onLogin: (user: CurrentUser) => void;
  onRegister: (account: Omit<ManagedAccount, 'id' | 'joinedAt' | 'status'>) => void;
};

type AuthMode = 'login' | 'signup';

export function LoginScreen({ accounts, onLogin, onRegister }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('팀원');
  const [part, setPart] = useState<TeamPart>('TEST혁신파트');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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

    if (mode === 'login') {
      const account = accounts.find((item) => item.email.toLowerCase() === trimmedEmail);

      if (!account) {
        setError('가입된 계정이 없어요. 먼저 가입 요청을 해주세요.');
        return;
      }

      if (account.name !== trimmedName) {
        setError('이름과 사내메일이 가입 정보와 일치하지 않아요.');
        return;
      }

      if (account.status === '승인 대기') {
        setError('아직 승인 대기 중인 계정이에요. 팀리더가 활성 처리하면 로그인할 수 있어요.');
        return;
      }

      if (account.status === '비활성') {
        setError('비활성 계정이에요. 팀리더에게 계정 상태 확인을 요청해주세요.');
        return;
      }

      setError('');
      setNotice('');
      onLogin({ name: account.name, email: account.email, role: account.role, part: account.part });
      return;
    }

    if (accounts.some((account) => account.email.toLowerCase() === trimmedEmail)) {
      setError('이미 가입된 사내메일이에요. 로그인으로 진행해주세요.');
      return;
    }

    setError('');
    setNotice('가입 요청이 접수됐어요. 팀리더가 계정 관리에서 활성 처리하면 로그인할 수 있어요.');
    onRegister({ name: trimmedName, email: trimmedEmail, role, part: role === '팀리더' ? '전체' : part });
    setMode('login');
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
            가입된 사내 계정으로 로그인한 뒤 소속 파트와 권한을 기준으로 의견 접수, 안건 투표, 리더 관리함을 사용할 수 있습니다.
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
          <h2>{mode === 'login' ? '사내 계정으로 로그인' : '새 계정 가입 요청'}</h2>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="인증 방식">
          <button className={mode === 'login' ? 'selected' : ''} type="button" onClick={() => setMode('login')}>
            <LogIn size={16} />
            로그인
          </button>
          <button className={mode === 'signup' ? 'selected' : ''} type="button" onClick={() => setMode('signup')}>
            <UserPlus size={16} />
            가입
          </button>
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

        {mode === 'signup' && (
          <>
            <label>
              권한
              <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                {userRoles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            {role !== '팀리더' ? (
              <label>
                소속 파트
                <select value={part} onChange={(event) => setPart(event.target.value as TeamPart)}>
                  {teamParts.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="role-note">
                <strong>팀리더 권한</strong>
                <span>팀리더는 특정 파트 소속을 선택하지 않고 전체 팀 기준으로 계정과 리더 관리함을 볼 수 있어요.</span>
              </div>
            )}
          </>
        )}

        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-success">{notice}</p>}

        <button className="primary-button wide" type="submit">
          {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
          {mode === 'login' ? '로그인' : '가입 요청'}
        </button>

        <div className="quick-login">
          <span>빠른 로그인 (데모)</span>
          <div className="quick-login-row">
            {quickLeader && (
              <button type="button" onClick={() => onLogin(toCurrentUser(quickLeader))}>
                리더 · {quickLeader.name}
              </button>
            )}
            {quickMember && (
              <button type="button" onClick={() => onLogin(toCurrentUser(quickMember))}>
                팀원 · {quickMember.name}
              </button>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}
