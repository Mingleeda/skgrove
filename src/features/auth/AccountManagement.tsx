import { KeyRound, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { teamParts, userRoles } from '../../auth';
import { PanelHeader } from '../../components/PanelHeader';
import type { AccountStatus, ManagedAccount, TeamPart, UserRole } from '../../types';

type AccountManagementProps = {
  accounts: ManagedAccount[];
  onAccountsChange: (accounts: ManagedAccount[]) => void;
};

export function AccountManagement({ accounts, onAccountsChange }: AccountManagementProps) {
  const updateRole = (id: string, role: UserRole) => {
    onAccountsChange(
      accounts.map((account) =>
        account.id === id ? { ...account, role, part: role === '팀리더' ? '전체' : normalizePart(account.part) } : account,
      ),
    );
  };

  const updatePart = (id: string, part: TeamPart) => {
    onAccountsChange(accounts.map((account) => (account.id === id ? { ...account, part } : account)));
  };

  const updateStatus = (id: string, status: AccountStatus) => {
    onAccountsChange(accounts.map((account) => (account.id === id ? { ...account, status } : account)));
  };

  const updateConnectioner = (id: string, connectioner: boolean) => {
    onAccountsChange(accounts.map((account) => (account.id === id ? { ...account, connectioner } : account)));
  };

  const pendingCount = accounts.filter((account) => account.status === '승인 대기').length;
  const leaderCount = accounts.filter((account) => account.role !== '팀원').length;
  const connectionerCount = accounts.filter((account) => account.connectioner).length;

  return (
    <section className="screen">
      <div className="account-summary">
        <div>
          <UsersRound size={22} />
          <span>가입 계정</span>
          <strong>{accounts.length}</strong>
        </div>
        <div>
          <ShieldCheck size={22} />
          <span>리더 권한</span>
          <strong>{leaderCount}</strong>
        </div>
        <div>
          <UserCheck size={22} />
          <span>승인 대기</span>
          <strong>{pendingCount}</strong>
        </div>
        <div>
          <KeyRound size={22} />
          <span>커넥셔너</span>
          <strong>{connectionerCount}</strong>
        </div>
      </div>

      <section className="panel">
        <PanelHeader icon={UsersRound} title="가입 계정 관리" />
        <p className="account-hint">권한·파트·상태·커넥셔너는 바꾸는 즉시 저장됩니다.</p>
        <div className="account-table">
          <div className="account-table-head">
            <span>계정</span>
            <span>권한</span>
            <span>파트</span>
            <span>상태</span>
            <span>커넥셔너</span>
          </div>
          {accounts.map((account) => (
            <div className="account-row" key={account.id}>
              <div>
                <strong>{account.name}</strong>
                <span>
                  {account.email} · {account.joinedAt}
                </span>
              </div>
              <select value={account.role} onChange={(event) => updateRole(account.id, event.target.value as UserRole)}>
                {userRoles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
              {account.role === '팀리더' ? (
                <span className="part-static">전체</span>
              ) : (
                <select value={account.part} onChange={(event) => updatePart(account.id, event.target.value as TeamPart)}>
                  {teamParts.map((part) => (
                    <option key={part}>{part}</option>
                  ))}
                </select>
              )}
              <select value={account.status} onChange={(event) => updateStatus(account.id, event.target.value as AccountStatus)}>
                <option>승인 대기</option>
                <option>활성</option>
                <option>비활성</option>
              </select>
              <label className={account.connectioner ? 'connectioner-toggle on' : 'connectioner-toggle'}>
                <input
                  type="checkbox"
                  aria-label={`${account.name} 커넥셔너 전권`}
                  checked={account.connectioner ?? false}
                  onChange={(event) => updateConnectioner(account.id, event.target.checked)}
                />
              </label>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function normalizePart(part: TeamPart): TeamPart {
  return part === '전체' ? 'TEST혁신파트' : part;
}
