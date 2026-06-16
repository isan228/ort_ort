export default function PlaceholderPage({ title, description }) {
  return (
    <div className="card">
      <h1>{title}</h1>
      <p className="muted">{description}</p>
      <p>Страница в разработке — маршрут и layout уже подключены.</p>
    </div>
  );
}
