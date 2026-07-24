import type { ReactNode } from 'react';
import { Bell, HeartHandshake, MessageSquarePlus } from 'lucide-react';
import { sections } from '../navigation';
import type { Section } from '../types';

type AppShellProps = {
  active: Section;
  children: ReactNode;
  onSectionChange: (section: Section) => void;
};

export function AppShell({ active, children, onSectionChange }: AppShellProps) {
  const currentSection = sections.find((section) => section.id === active) ?? sections[0];

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
          <span>현재 화면</span>
          <strong>{currentSection.owner}</strong>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">대나무숲 기반 팀문화 개선</p>
            <h1>{currentSection.label}</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" title="알림">
              <Bell size={19} />
            </button>
            <button className="primary-button" onClick={() => onSectionChange('intake')}>
              <MessageSquarePlus size={18} />
              의견 접수
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
