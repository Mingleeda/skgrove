import { FormEvent, useState } from 'react';
import { HeartHandshake, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { teamParts, isCompanyEmail } from '../../auth';
import type { CurrentUser, ManagedAccount, TeamPart } from '../../types';

const toCurrentUser = (account: ManagedAccount): CurrentUser => ({
  name: account.name,
  email: account.email,
  role: account.role,
  part: account.part,
  connectioner: account.connectioner ?? false,
});

// 빠른 로그인(데모) 대상 계정. 리더=심상준(팀리더), 팀원=이수현(팀원).
const DEMO_LEADER_EMAIL = 'simair@sk.com';
const DEMO_MEMBER_EMAIL = 'suhyunle@sk.com';

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
  const [part, setPart] = useState<TeamPart>('TEST혁신파트');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // 빠른 로그인(데모)은 로그인 화면 로고를 눌러야 열리는 히든 제스처. 일반 유저는 발견하기 어렵다.
  const [showQuickLogin, setShowQuickLogin] = useState(false);

  const quickLeader = accounts.find(
    (account) => account.email.toLowerCase() === DEMO_LEADER_EMAIL && account.status === '활성',
  );
  const quickMember = accounts.find(
    (account) => account.email.toLowerCase() === DEMO_MEMBER_EMAIL && account.status === '활성',
  );

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
      onLogin(toCurrentUser(account));
      return;
    }

    if (accounts.some((account) => account.email.toLowerCase() === trimmedEmail)) {
      setError('이미 가입된 사내메일이에요. 로그인으로 진행해주세요.');
      return;
    }

    setError('');
    setNotice('가입 요청이 접수됐어요. 팀리더가 계정 관리에서 활성 처리하면 로그인할 수 있어요.');
    // 권한은 항상 '팀원'으로 고정한다. 클라이언트가 보낸 값을 신뢰하지 않는다.
    onRegister({ name: trimmedName, email: trimmedEmail, role: '팀원', part });
    setMode('login');
  };

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand login-brand">
          {/* 로고 클릭 = 커넥셔너용 빠른 로그인(데모) 히든 토글. 일반 유저는 알기 어렵다. */}
          <div className="brand-mark" onClick={() => setShowQuickLogin((prev) => !prev)} title="SK Grove">
            <HeartHandshake size={24} />
          </div>
          <div>
            <strong>SK Grove</strong>
            <span>Team Culture Hub</span>
          </div>
        </div>

        <div>
          <h1>편하게 말하고, 함께 정하고, 작게 바꿔요</h1>
          <p>사내 계정으로 로그인하면 의견 접수, 안건 투표, 리더 관리 흐름을 바로 사용할 수 있습니다.</p>
        </div>

        <div className="login-assurance">
          <ShieldCheck size={20} />
          익명 의견은 작성자 정보와 분리해서 다룹니다.
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
              소속 파트
              <select value={part} onChange={(event) => setPart(event.target.value as TeamPart)}>
                {teamParts.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            {/*
              권한은 가입 폼에서 고르지 않는다. 신청자가 '팀리더'를 선택할 수 있으면
              승인자가 권한 항목을 눈여겨보지 않는 순간 그대로 통과한다.
              권한 상향은 계정 관리 화면에서 팀리더가 명시적으로 처리한다.
            */}
            <div className="role-note">
              <strong>권한은 팀원으로 시작합니다</strong>
              <span>파트리더·팀리더 권한이 필요하면 가입 승인 후 팀리더가 계정 관리에서 변경합니다.</span>
            </div>
          </>
        )}

        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-success">{notice}</p>}

        <button className="primary-button wide" type="submit">
          {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
          {mode === 'login' ? '로그인' : '가입 요청'}
        </button>

        {showQuickLogin && (quickLeader || quickMember) && (
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
        )}
      </form>
    </main>
  );
}
