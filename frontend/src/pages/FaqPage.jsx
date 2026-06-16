import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function FaqPage() {
  const { locale, t } = useI18n();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .getFaq(locale)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [locale]);

  if (loading) return <p>{t('common.loading')}</p>;

  return (
    <>
      <h1>{t('faq.title')}</h1>
      <p className="muted">{t('faq.subtitle')}</p>
      {error && <div className="error">{error}</div>}

      {items.map((item) => (
        <div key={item.id} className="card faq-item">
          <button
            type="button"
            className="faq-question btn-link"
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
          >
            {openId === item.id ? '▼' : '▶'} {item.question}
          </button>
          {openId === item.id && (
            <div
              className="faq-answer muted"
              dangerouslySetInnerHTML={{ __html: item.answer }}
            />
          )}
          {item.category && (
            <span className="faq-category muted">{item.category}</span>
          )}
        </div>
      ))}

      {!items.length && !error && <p className="muted">{t('faq.empty')}</p>}
    </>
  );
}
