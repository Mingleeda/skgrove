import type { ReactNode } from 'react';
import { Bell, HeartHandshake, Lock, LogOut, MessageSquarePlus } from 'lucide-react';
import { isLeader, isTeamLeader } from '../auth';
import { navGroups, sections } from '../navigation';
import type { CurrentUser, Section } from '../types';

function lockReasonFor(id: Section, canUseLeaderMenu: boolean, canUseAccountsMenu: boolean) {
  if (id === 'leader' && !canUseLeaderMenu) return '파트리더 이상만 사용할 수 있어요.';
  if (id === 'accounts' && !canUseAccountsMenu) return '팀리더만 사용할 수 있어요.';
  return null;
}

type AppShellProps = {
  active: Section;
  children: ReactNode;
  currentUser: CurrentUser;
  unreadCount: number;
  onLogout: () => void;
  onSectionChange: (section: Section) => void;
};

export function AppShell({ active, children, currentUser, unreadCount, onLogout, onSectionChange }: AppShellProps) {
  const currentSection = sections.find((section) => section.id === active) ?? sections[0];
  const userCanUseLeaderMenu = isLeader(currentUser);
  const userCanUseAccountsMenu = isTeamLeader(currentUser);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <HeartHandshake size={24} />
          </div>
          <div>
            <strong>SK Grove</strong>
            <span>Team Culture Hub</span>
          </div>
        </div>

        <nav className="nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <p className="nav-group-title">{group.title}</p>
              {group.items.map((section) => {
                const Icon = section.icon;
                const lockReason = lockReasonFor(section.id, userCanUseLeaderMenu, userCanUseAccountsMenu);
                return (
                  <button
                    className={active === section.id ? 'nav-item active' : 'nav-item'}
                    disabled={Boolean(lockReason)}
                    key={section.id}
                    onClick={() => onSectionChange(section.id)}
                    // 잠긴 메뉴는 '왜 못 쓰는지'를 알려줘야 한다.
                    // 흐리게만 처리하면 사용자는 고장으로 읽는다.
                    title={lockReason ?? `${section.label} · ${section.owner}`}
                  >
                    <Icon size={18} />
                    <span>{section.label}</span>
                    {lockReason && <Lock size={14} className="nav-lock" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="owner-box">
          <span>{currentUser.part}</span>
          <strong>{currentUser.name}</strong>
          <em>{currentUser.role}</em>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">대나무숲 기반 팀문화 개선</p>
            <h1>{currentSection.label}</h1>
          </div>
          <div className="top-actions">
            <div className="user-chip">
              <strong>{currentUser.name}</strong>
              <span>
                {currentUser.role} · {currentUser.part}
              </span>
            </div>
            <button
              className={active === 'notifications' ? 'icon-button has-badge active' : 'icon-button has-badge'}
              title="알림 / 메시지"
              onClick={() => onSectionChange('notifications')}
            >
              <Bell size={19} />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
            <button className="primary-button" onClick={() => onSectionChange('intake')}>
              <MessageSquarePlus size={18} />
              의견 접수
            </button>
            <button className="icon-button" onClick={onLogout} title="로그아웃">
              <LogOut size={19} />
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
