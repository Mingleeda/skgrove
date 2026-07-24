import type { ElementType } from 'react';

type PanelHeaderProps = {
  icon: ElementType;
  title: string;
};

export function PanelHeader({ icon: Icon, title }: PanelHeaderProps) {
  return (
    <div className="panel-header">
      <Icon size={20} />
      <h2>{title}</h2>
    </div>
  );
}
