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

  if (loading) {
    return (
      <div className="page">
        <div className="page-inner page-inner--narrow">
          <p className="page-empty">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-inner page-inner--narrow">
        <header className="page-head">
          <h1>{t('faq.title')}</h1>
          <p>{t('faq.subtitle')}</p>
        </header>

        {error && <div className="error">{error}</div>}

        <div className="page-faq-list">
          {items.map((item) => (
            <article key={item.id} className="page-faq-item">
              <button
                type="button"
                className="page-faq-question"
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
                aria-expanded={openId === item.id}
              >
                <span className="page-faq-chevron">{openId === item.id ? '▼' : '▶'}</span>
                {item.question}
              </button>
              {openId === item.id && (
                <div className="page-faq-answer" dangerouslySetInnerHTML={{ __html: item.answer }} />
              )}
              {item.category && openId === item.id && (
                <span className="page-faq-category">{item.category}</span>
              )}
            </article>
          ))}
        </div>

        {!items.length && !error && <p className="page-empty">{t('faq.empty')}</p>}
      </div>
    </div>
  );
}
