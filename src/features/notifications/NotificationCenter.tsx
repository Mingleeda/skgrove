import { useState } from 'react';
import type { ElementType } from 'react';
import { Bell, Clock, Coffee, FileCheck2, Inbox, Laugh, Mail, MessageSquare, Vote } from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';
import type { AppNotification, CurrentUser, ManagedAccount, NotificationKind, Section } from '../../types';

type NotificationCenterProps = {
  notifications: AppNotification[];
  currentUser: CurrentUser;
  accounts: ManagedAccount[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSend: (recipientName: string, body: string) => void;
  onOpen: (section: Section) => void;
};

const KIND_LABEL: Record<NotificationKind, string> = {
  issue: '의견',
  agenda: '안건',
  deadline: '마감',
  action: '액션',
  tea: '티미팅',
  humor: '유머',
  message: '메시지',
};

const KIND_ICON: Record<NotificationKind, ElementType> = {
  issue: Inbox,
  agenda: Vote,
  deadline: Clock,
  action: FileCheck2,
  tea: Coffee,
  humor: Laugh,
  message: MessageSquare,
};

export function NotificationCenter({
  notifications,
  currentUser,
  accounts,
  onMarkRead,
  onMarkAllRead,
  onSend,
  onOpen,
}: NotificationCenterProps) {
  const recipients = accounts.filter((account) => account.status === '활성' && account.name !== currentUser.name);
  const [to, setTo] = useState<string>(recipients[0]?.name ?? '');
  const [body, setBody] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const received = notifications.filter((item) => item.recipientName === currentUser.name);
  const sent = notifications.filter((item) => item.kind === 'message' && item.fromName === currentUser.name);
  const unread = received.filter((item) => !item.read).length;
  const readCount = received.length - unread;
  const visibleReceived = received.filter((item) => {
    if (filter === 'unread') return !item.read;
    if (filter === 'read') return item.read;
    return true;
  });
  const emptyMessage =
    received.length === 0
      ? '받은 알림이 없습니다.'
      : filter === 'unread'
        ? '안읽은 알림이 없습니다.'
        : filter === 'read'
          ? '읽은 알림이 없습니다.'
          : '받은 알림이 없습니다.';

  const openNotification = (item: AppNotification) => {
    if (!item.read) onMarkRead(item.id);
    if (item.section !== 'notifications') onOpen(item.section);
  };

  const submit = () => {
    if (!to || !body.trim()) return;
    onSend(to, body.trim());
    setBody('');
  };

  return (
    <section className="screen">
      <section className="panel">
        <div className="notif-head">
          <PanelHeader icon={Bell} title={`받은 알림 · 안읽음 ${unread}`} />
          {received.length > 0 && (
            <button className="secondary-button" onClick={onMarkAllRead} disabled={unread === 0}>
              모두 읽음
            </button>
          )}
        </div>
        {received.length > 0 && (
          <div className="segmented">
            <button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>
              전체 {received.length}
            </button>
            <button className={filter === 'unread' ? 'selected' : ''} onClick={() => setFilter('unread')}>
              안읽음 {unread}
            </button>
            <button className={filter === 'read' ? 'selected' : ''} onClick={() => setFilter('read')}>
              읽음 {readCount}
            </button>
          </div>
        )}
        <div className="notif-list">
          {visibleReceived.length === 0 && <p className="can-empty">{emptyMessage}</p>}
          {visibleReceived.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <button
                key={item.id}
                className={item.read ? 'notif-row' : 'notif-row unread'}
                onClick={() => openNotification(item)}
              >
                <span className={`notif-kind ${item.kind}`}>
                  <Icon size={14} />
                  {KIND_LABEL[item.kind]}
                </span>
                <span className="notif-body">
                  <strong>{item.title}</strong>
                  {item.body && <span>{item.body}</span>}
                  <small>
                    {item.fromName} · {item.createdAt}
                  </small>
                </span>
                {!item.read && <span className="notif-dot" aria-label="안읽음" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel form-panel">
        <PanelHeader icon={Mail} title="메시지 보내기" />
        {recipients.length === 0 ? (
          <p className="can-empty">보낼 수 있는 대상이 없습니다.</p>
        ) : (
          <>
            <label>
              받는 사람
              <select value={to} onChange={(event) => setTo(event.target.value)}>
                {recipients.map((account) => (
                  <option key={account.id} value={account.name}>
                    {account.name} · {account.role} · {account.part}
                  </option>
                ))}
              </select>
            </label>
            <label>
              내용
              <textarea
                value={body}
                placeholder="메시지를 입력하세요"
                onChange={(event) => setBody(event.target.value)}
              />
            </label>
            <button className="primary-button wide" disabled={!to || !body.trim()} onClick={submit}>
              보내기
            </button>
          </>
        )}
      </section>

      <section className="panel">
        <PanelHeader icon={MessageSquare} title={`보낸 메시지 · ${sent.length}`} />
        <div className="notif-list">
          {sent.length === 0 && <p className="can-empty">보낸 메시지가 없습니다.</p>}
          {sent.map((item) => (
            <div key={item.id} className="notif-row">
              <span className="notif-kind message">
                <MessageSquare size={14} />
                {item.recipientName}
              </span>
              <span className="notif-body">
                <span>{item.body}</span>
                <small>{item.createdAt}</small>
              </span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
