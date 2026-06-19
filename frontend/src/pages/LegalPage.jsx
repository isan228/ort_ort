import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const TYPE_LABELS = {
  privacy: 'legal.privacy',
  terms: 'legal.terms',
  offer: 'legal.offer',
};

export default function LegalPage({ type }) {
  const { locale, t } = useI18n();
  const [document, setDocument] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .getLegalDocument(type, locale)
      .then((data) => setDocument(data.document))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [type, locale]);

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
        <p className="page-breadcrumbs">
          <Link to="/">{t('common.back')}</Link> &gt; {document?.title || t(TYPE_LABELS[type] || type)}
        </p>

        <header className="page-head">
          <h1>{document?.title || t(TYPE_LABELS[type] || type)}</h1>
        </header>

        {error && <div className="error">{error}</div>}

        {document && (
          <div className="page-prose" dangerouslySetInnerHTML={{ __html: document.body }} />
        )}
      </div>
    </div>
  );
}
