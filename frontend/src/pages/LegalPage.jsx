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

  if (loading) return <p>{t('common.loading')}</p>;

  return (
    <>
      <p>
        <Link to="/">{t('common.back')}</Link>
      </p>
      <h1>{document?.title || t(TYPE_LABELS[type] || type)}</h1>
      {error && <div className="error">{error}</div>}
      {document && (
        <div className="card legal-body" dangerouslySetInnerHTML={{ __html: document.body }} />
      )}
    </>
  );
}
