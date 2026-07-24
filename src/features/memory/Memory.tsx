const memories = ['캔미팅 워크샵', '상반기 회고', '랜덤 커피챗', '파트 데모데이'];

export function Memory() {
  return (
    <section className="screen">
      <div className="memory-grid">
        {memories.map((item, index) => (
          <article className="memory-card" key={item}>
            <div className={`photo-block photo-${index + 1}`} />
            <h2>{item}</h2>
            <span>댓글 {index + 2} · 반응 {index + 8}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
