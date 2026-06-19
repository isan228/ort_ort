import { Link } from 'react-router-dom';

export default function PlaceholderPage({ title, description }) {
  return (
    <div className="page">
      <div className="page-inner page-inner--narrow">
        <div className="page-404">
          <h1>{title === '404' ? '404' : title}</h1>
          <p className="muted">{description}</p>
          {title === '404' && (
            <p style={{ marginTop: '0.5rem', color: '#64748b' }}>Страница не найдена или ещё в разработке.</p>
          )}
          <div className="page-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
            <Link to="/" className="btn">
              На главную
            </Link>
            <Link to="/universities" className="btn btn-secondary">
              Каталог вузов
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
