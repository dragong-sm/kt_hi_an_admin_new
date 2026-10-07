export default function Stars({ rating }) {
  return (
    <span className="stars" role="img" aria-label={`5점 만점에 ${rating}점`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? 'is-on' : undefined} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}
