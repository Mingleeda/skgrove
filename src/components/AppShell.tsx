import { useState, type ReactNode } from 'react';
import { Bell, Camera, HeartHandshake, LogOut, MessageSquarePlus } from 'lucide-react';
import { isLeader, isTeamLeader } from '../auth';
import { sections } from '../navigation';
import type { CurrentUser, Section } from '../types';
import { Avatar } from './Avatar';

type AppShellProps = {
  active: Section;
  children: ReactNode;
  currentUser: CurrentUser;
  currentPhotoUrl?: string;
  onSavePhoto: (photoUrl: string) => void;
  unreadCount: number;
  onLogout: () => void;
  onSectionChange: (section: Section) => void;
};

export function AppShell({
  active,
  children,
  currentUser,
  currentPhotoUrl,
  onSavePhoto,
  unreadCount,
  onLogout,
  onSectionChange,
}: AppShellProps) {
  const currentSection = sections.find((section) => section.id === active) ?? sections[0];
  const userCanUseLeaderMenu = isLeader(currentUser);
  const userCanUseAccountsMenu = isTeamLeader(currentUser);

  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoInput, setPhotoInput] = useState('');

  const openPhotoEditor = () => {
    setPhotoInput(currentPhotoUrl ?? '');
    setPhotoOpen(true);
  };

  const savePhoto = () => {
    onSavePhoto(photoInput);
    setPhotoOpen(false);
  };

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
                disabled={
                  (section.id === 'leader' && !userCanUseLeaderMenu) ||
                  (section.id === 'accounts' && !userCanUseAccountsMenu)
                }
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
              <button className="user-photo-button" onClick={openPhotoEditor} title="프로필 사진 변경" type="button">
                <Avatar name={currentUser.name} />
                <span className="user-photo-edit">
                  <Camera size={11} />
                </span>
              </button>
              <div className="user-chip-text">
                <strong>{currentUser.name}</strong>
                <span>
                  {currentUser.role} · {currentUser.part}
                </span>
              </div>
              {photoOpen && (
                <div className="photo-editor-pop">
                  <label htmlFor="user-photo-url">프로필 사진 URL</label>
                  <input
                    id="user-photo-url"
                    value={photoInput}
                    onChange={(event) => setPhotoInput(event.target.value)}
                    placeholder="https://…/photo.jpg"
                    autoFocus
                  />
                  <div className="photo-editor-preview">
                    {photoInput.trim() ? <img src={photoInput} alt="미리보기" /> : <span>미리보기</span>}
                  </div>
                  <div className="photo-editor-actions">
                    <button className="secondary-button" onClick={() => setPhotoOpen(false)} type="button">
                      취소
                    </button>
                    <button className="primary-button" onClick={savePhoto} type="button">
                      저장
                    </button>
                  </div>
                </div>
              )}
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
