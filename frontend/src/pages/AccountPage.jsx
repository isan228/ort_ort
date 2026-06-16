import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getStoredUser, isStaffRole } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useTheme } from '../theme/ThemeContext.jsx';

export default function AccountPage() {
  const stored = getStoredUser();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [account, setAccount] = useState(null);
  const [nickname, setNickname] = useState('');
  const [displayMode, setDisplayMode] = useState('nickname');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.me();
      setAccount(data);
      setNickname(data.profile?.nickname || '');
      setDisplayMode(data.profile?.public_display_mode || 'nickname');
      setCertificateNumber(data.profile?.certificate_number || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.updateProfile({
        nickname,
        public_display_mode: displayMode,
        certificate_number: certificateNumber || null,
      });
      setMessage('Профиль сохранён');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!stored) {
    return (
      <div className="card">
        <h1>Личный кабинет</h1>
        <p>
          <Link to="/login">Войдите</Link>, чтобы открыть профиль.
        </p>
      </div>
    );
  }

  if (loading) return <p>Загрузка...</p>;

  return (
    <>
      <h1>Личный кабинет</h1>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="card">
        <h2>Аккаунт</h2>
        <p>Email: {account?.user?.email || '—'}</p>
        <p>Телефон: {account?.user?.phone || '—'}</p>
        <p>Фаза: {account?.user?.phase}</p>
        <p>
          Premium: {account?.premium?.active ? 'активен' : 'нет'}
          {!account?.premium?.active && (
            <>
              {' '}
              · <Link to="/subscription">Подключить</Link>
            </>
          )}
        </p>
      </div>

      <div className="card">
        <h2>{t('account.preferences')}</h2>
        <p className="muted">{t('account.language')}</p>
        <div className="lang-switch" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={locale === 'ru' ? 'chip active' : 'chip'}
            onClick={() => setLocale('ru')}
          >
            {t('lang.ru')}
          </button>
          <button
            type="button"
            className={locale === 'ky' ? 'chip active' : 'chip'}
            onClick={() => setLocale('ky')}
          >
            {t('lang.ky')}
          </button>
        </div>
        <p className="muted">{t('account.theme')}</p>
        <div className="lang-switch">
          <button
            type="button"
            className={theme === 'light' ? 'chip active' : 'chip'}
            onClick={() => setTheme('light')}
          >
            {t('theme.light')}
          </button>
          <button
            type="button"
            className={theme === 'dark' ? 'chip active' : 'chip'}
            onClick={() => setTheme('dark')}
          >
            {t('theme.dark')}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Публичный профиль</h2>
        <form onSubmit={saveProfile}>
          <label>
            Никнейм
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              style={{ display: 'block', width: '100%', maxWidth: 360, padding: 8, marginTop: 4, marginBottom: 12 }}
            />
          </label>
          <label>
            Режим отображения в рейтингах
            <select
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value)}
              style={{ display: 'block', padding: 8, marginTop: 4, marginBottom: 12 }}
            >
              <option value="nickname">Никнейм</option>
              <option value="certificate_number">Номер сертификата</option>
            </select>
          </label>
          <label>
            Номер сертификата (для публичного режима)
            <input
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              style={{ display: 'block', width: '100%', maxWidth: 360, padding: 8, marginTop: 4, marginBottom: 12 }}
            />
          </label>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>

      <div className="tiles">
        <Link to="/account/scores" className="tile card">
          <h3>Баллы и сертификат</h3>
        </Link>
        <Link to="/account/wallet" className="tile card">
          <h3>Кошелёк и бонусы</h3>
        </Link>
        <Link to="/analysis" className="tile card">
          <h3>Анализ шансов</h3>
        </Link>
        <Link to="/tours" className="tile card">
          <h3>Туры</h3>
        </Link>
        <Link to="/account/collections" className="tile card">
          <h3>Избранное и сравнение</h3>
        </Link>
        <Link to="/account/support" className="tile card">
          <h3>Поддержка</h3>
        </Link>
        <Link to="/account/notifications" className="tile card">
          <h3>Уведомления</h3>
        </Link>
        {isStaffRole(account?.role) && (
          <Link to="/admin" className="tile card">
            <h3>Админ-панель</h3>
          </Link>
        )}
      </div>
    </>
  );
}
