import type { ReactNode } from 'react';
import { Bell, HeartHandshake, LogOut, MessageSquarePlus } from 'lucide-react';
import { isLeader } from '../auth';
import { sections } from '../navigation';
import type { CurrentUser, Section } from '../types';

type AppShellProps = {
  active: Section;
  children: ReactNode;
  currentUser: CurrentUser;
  onLogout: () => void;
  onSectionChange: (section: Section) => void;
};

export function AppShell({ active, children, currentUser, onLogout, onSectionChange }: AppShellProps) {
  const currentSection = sections.find((section) => section.id === active) ?? sections[0];
  const userCanUseLeaderMenu = isLeader(currentUser);

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
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                className={active === section.id ? 'nav-item active' : 'nav-item'}
                disabled={section.id === 'leader' && !userCanUseLeaderMenu}
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                title={`${section.label} · ${section.owner}`}
              >
                <Icon size={18} />
                <span>{section.label}</span>
              </button>
            );
          })}
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
            <button className="icon-button" title="알림">
              <Bell size={19} />
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
