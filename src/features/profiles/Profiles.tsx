import { profiles } from '../../data/mockData';

export function Profiles() {
  return (
    <section className="screen">
      <div className="profile-grid">
        {profiles.map((profile) => (
          <article className={`profile-card ${profile.color}`} key={profile.name}>
            <div className="avatar">{profile.name.slice(0, 1)}</div>
            <h2>{profile.name}</h2>
            <span>{profile.part}</span>
            <strong>{profile.trait}</strong>
            <p>{profile.style}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
