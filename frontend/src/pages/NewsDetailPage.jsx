import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

export default function NewsDetailPage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getNewsArticle(slug)
      .then((data) => setArticle(data.article))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="news-page">
        <div className="news-page-inner">
          <p className="news-empty">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-page">
        <div className="news-page-inner">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="news-page">
        <div className="news-page-inner">
          <p className="news-empty">Статья не найдена</p>
        </div>
      </div>
    );
  }

  return (
    <div className="news-page">
      <div className="news-page-inner">
        <p className="news-widget-link" style={{ marginBottom: '1rem' }}>
          <Link to="/news">← Все новости</Link>
        </p>

        <article className="news-main-card">
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem' }}>{article.title}</h1>
          {article.published_at && (
            <p className="news-empty" style={{ textAlign: 'left', padding: '0 0 1rem' }}>
              {new Date(article.published_at).toLocaleString('ru-RU')}
            </p>
          )}
          <div className="news-body" dangerouslySetInnerHTML={{ __html: article.body }} />
        </article>
      </div>
    </div>
  );
}
