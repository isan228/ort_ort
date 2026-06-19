import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useToast } from './ux/ToastContext.jsx';

export default function FavoriteButton({ entityType, entityId, label = 'В избранное' }) {
  const { t } = useI18n();
  const toast = useToast();
  const user = getStoredUser();
  const [favoriteId, setFavoriteId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api
      .getFavorites()
      .then((data) => {
        const match = (data.favorites || []).find(
          (f) => f.entity_type === entityType && f.entity_id === entityId
        );
        setFavoriteId(match?.id || null);
      })
      .catch(() => setFavoriteId(null));
  }, [user, entityType, entityId]);

  if (!user) {
    return (
      <span className="guest-fav-hint">
        <Link to="/login">{t('ux.empty.toLogin')}</Link> — {t('ux.guestFavorite')}
      </span>
    );
  }

  async function toggle() {
    setBusy(true);
    setError('');
    try {
      if (favoriteId) {
        await api.removeFavorite(favoriteId);
        setFavoriteId(null);
        toast.info(t('ux.fav.removed'));
      } else {
        const data = await api.addFavorite({ entity_type: entityType, entity_id: entityId });
        setFavoriteId(data.favorite.id);
        toast.success(t('ux.fav.added'));
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="favorite-btn-wrap">
      <button type="button" className="btn btn-secondary uni-fav-btn" disabled={busy} onClick={toggle}>
        {favoriteId ? '★ В избранном' : `☆ ${label}`}
      </button>
      {error && <span className="error inline-error">{error}</span>}
    </span>
  );
}
