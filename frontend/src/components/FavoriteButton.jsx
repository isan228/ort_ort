import { useEffect, useState } from 'react';
import { api, getStoredUser } from '../api/client.js';

export default function FavoriteButton({ entityType, entityId, label = 'В избранное' }) {
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

  if (!user) return null;

  async function toggle() {
    setBusy(true);
    setError('');
    try {
      if (favoriteId) {
        await api.removeFavorite(favoriteId);
        setFavoriteId(null);
      } else {
        const data = await api.addFavorite({ entity_type: entityType, entity_id: entityId });
        setFavoriteId(data.favorite.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="favorite-btn-wrap">
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={toggle}>
        {favoriteId ? '★ В избранном' : `☆ ${label}`}
      </button>
      {error && <span className="error inline-error">{error}</span>}
    </span>
  );
}
