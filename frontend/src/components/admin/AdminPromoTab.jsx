import { useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../components/ux/ToastContext.jsx';

export default function AdminPromoTab({ promoCodes, onUpdated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'percent',
    discount_value: '',
    max_uses: '',
    expires_at: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.adminCreatePromoCode({
        code: form.code,
        description: form.description || undefined,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
      });
      toast.success('Промокод создан');
      setForm({
        code: '',
        description: '',
        discount_type: 'percent',
        discount_value: '',
        max_uses: '',
        expires_at: '',
      });
      onUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(promo) {
    try {
      await api.adminUpdatePromoCode(promo.id, { is_active: !promo.is_active });
      onUpdated();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="admin-promo-tab">
      <div className="card admin-card">
        <h2>Создать промокод</h2>
        <p className="muted">Только администраторы могут создавать промокоды. Пользователи применяют их при оплате подписки.</p>
        <form className="admin-form-grid" onSubmit={handleCreate}>
          <label>
            Код
            <input
              value={form.code}
              onChange={(e) => updateField('code', e.target.value)}
              required
              placeholder="SUMMER2026"
            />
          </label>
          <label>
            Описание
            <input
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Скидка на сезон"
            />
          </label>
          <label>
            Тип скидки
            <select value={form.discount_type} onChange={(e) => updateField('discount_type', e.target.value)}>
              <option value="percent">Процент</option>
              <option value="fixed">Фиксированная сумма (сом)</option>
            </select>
          </label>
          <label>
            Значение
            <input
              type="number"
              min="1"
              value={form.discount_value}
              onChange={(e) => updateField('discount_value', e.target.value)}
              required
            />
          </label>
          <label>
            Лимит использований
            <input
              type="number"
              min="1"
              value={form.max_uses}
              onChange={(e) => updateField('max_uses', e.target.value)}
              placeholder="Без лимита"
            />
          </label>
          <label>
            Действует до
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => updateField('expires_at', e.target.value)}
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Создание...' : 'Создать промокод'}
          </button>
        </form>
      </div>

      <h2 style={{ marginTop: '1.5rem' }}>Промокоды ({promoCodes.length})</h2>
      {promoCodes.map((promo) => (
        <div key={promo.id} className="card admin-card">
          <h3>
            {promo.code}{' '}
            <span className={`account-status-pill${promo.is_active ? '' : ' account-status-pill--muted'}`}>
              {promo.is_active ? 'активен' : 'выключен'}
            </span>
          </h3>
          {promo.description && <p className="muted">{promo.description}</p>}
          <p className="muted">
            Скидка:{' '}
            {promo.discount_type === 'percent'
              ? `${Number(promo.discount_value)}%`
              : `${Number(promo.discount_value)} сом`}
            {' · '}
            Использовано: {promo.used_count}
            {promo.max_uses != null ? ` / ${promo.max_uses}` : ''}
            {promo.expires_at && (
              <>
                {' · '}
                до {new Date(promo.expires_at).toLocaleString('ru-RU')}
              </>
            )}
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => toggleActive(promo)}>
            {promo.is_active ? 'Деактивировать' : 'Активировать'}
          </button>
        </div>
      ))}
      {!promoCodes.length && <p className="muted">Промокодов пока нет.</p>}
    </div>
  );
}
