import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const CATEGORY_LABELS = {
  announcement: 'Объявление',
  guide: 'Гайд',
};

export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getNews()
      .then((data) => setArticles(data.articles || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Загрузка...</p>;

  return (
    <>
      <h1>Новости</h1>
      <p className="muted">Актуальные материалы и гайды по поступлению.</p>

      {error && <div className="error">{error}</div>}

      <div className="news-list">
        {articles.map((article) => (
          <Link key={article.id} to={`/news/${article.slug}`} className="card news-card">
            <div className="news-card-meta">
              {article.category && (
                <span className="news-tag">{CATEGORY_LABELS[article.category] || article.category}</span>
              )}
              {article.published_at && (
                <span className="muted">
                  {new Date(article.published_at).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>
            <h2>{article.title}</h2>
            {article.excerpt && <p className="muted">{article.excerpt}</p>}
          </Link>
        ))}
      </div>

      {!articles.length && <p className="muted">Пока нет опубликованных новостей.</p>}
    </>
  );
}
