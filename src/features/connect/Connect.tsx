import { Coffee, Shuffle, UsersRound } from 'lucide-react';
import { PanelHeader } from '../../components/PanelHeader';

type ConnectProps = {
  matched: string[];
  onShuffleTeams: () => void;
};

export function Connect({ matched, onShuffleTeams }: ConnectProps) {
  return (
    <section className="screen">
      <div className="panel">
        <PanelHeader icon={Shuffle} title="커피뽑기 / 조뽑기" />
        <div className="draw-board">
          <div className="draw-controls">
            <button className="primary-button" onClick={onShuffleTeams}>
              <Shuffle size={18} />
              다시 뽑기
            </button>
            <button className="secondary-button">
              <UsersRound size={18} />
              파트 섞기
            </button>
          </div>
          <div className="match-list">
            {matched.map((match) => (
              <div className="match-card" key={match}>
                <Coffee size={22} />
                <strong>{match}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
