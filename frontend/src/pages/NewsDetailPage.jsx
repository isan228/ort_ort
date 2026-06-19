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
        <p className="news-breadcrumbs">
          <Link to="/">Главная</Link> &gt; <Link to="/news">Новости</Link> &gt; {article.title}
        </p>

        <article className="news-main-card news-detail-card">
          <header className="news-detail-head">
            <h1>{article.title}</h1>
            {article.published_at && (
              <time className="news-detail-date">
                {new Date(article.published_at).toLocaleString('ru-RU')}
              </time>
            )}
          </header>
          <div className="news-body" dangerouslySetInnerHTML={{ __html: article.body }} />
        </article>

        <p className="news-breadcrumbs" style={{ marginTop: '1rem' }}>
          <Link to="/news">← Все новости</Link>
        </p>
      </div>
    </div>
  );
}
