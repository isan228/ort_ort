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

  if (loading) return <p>Загрузка...</p>;
  if (error) return <div className="error">{error}</div>;
  if (!article) return <p>Статья не найдена</p>;

  return (
    <>
      <p className="muted">
        <Link to="/news">← Все новости</Link>
      </p>

      <article className="card news-article">
        <h1>{article.title}</h1>
        {article.published_at && (
          <p className="muted">{new Date(article.published_at).toLocaleString('ru-RU')}</p>
        )}
        <div className="news-body" dangerouslySetInnerHTML={{ __html: article.body }} />
      </article>
    </>
  );
}
