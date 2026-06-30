import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getStoredUser } from '../api/client.js';
import { TourIcon } from '../components/icons/TourIcons.jsx';
import PageLoader from '../components/ux/PageLoader.jsx';
import EmptyState from '../components/ux/EmptyState.jsx';
import { useToast } from '../components/ux/ToastContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { useFeatureAccess } from '../hooks/useFeatureAccess.js';

const SLOT_LABELS = {
  budget: 'Бюджет',
  contract: 'Контракт',
};

const STATUS_LABELS = {
  upcoming: 'Скоро',
  open: 'Открыт',
  closed: 'Закрыт',
};

export default function TourDetailPage() {
  const { t } = useI18n();
  const toast = useToast();
  const { can_use_tours, can_view_rankings, analysis_blocked_reason, loggedIn } = useFeatureAccess();
  const { id } = useParams();
  const user = getStoredUser();
  const [tour, setTour] = useState(null);
  const [slotType, setSlotType] = useState('budget');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getTour(id);
      setTour(data.tour);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleJoin() {
    setActing(true);
    setError('');
    try {
      const result = await api.joinTour(id, slotType);
      toast.success(
        result.hold_expires_at
          ? `Вы в туре. Место удерживается до ${new Date(result.hold_expires_at).toLocaleTimeString('ru-RU')}`
          : 'Вы успешно присоединились к туру'
      );
      await load();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setActing(false);
    }
  }

  async function handleWithdraw() {
    setActing(true);
    setError('');
    try {
      await api.withdrawTour(id);
      toast.success('Вы вышли из тура');
      await load();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="tours-page">
        <div className="tours-page-inner">
          <PageLoader />
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="tours-page">
        <div className="tours-page-inner">
          <EmptyState
            icon="🎯"
            title={t('ux.empty.notFound')}
            description="Тур не найден или уже завершён."
            actionLabel="Все туры"
            actionTo="/tours"
          />
        </div>
      </div>
    );
  }

  const joined = Boolean(tour.own_participation);
  const stats = tour.slot_stats;

  return (
    <div className="tours-page">
      <div className="tours-page-inner">
        <p className="tours-breadcrumbs">
          <Link to="/">Главная</Link> &gt; <Link to="/tours">Туры</Link> &gt; {tour.name}
        </p>

        <header className="tours-page-head">
          <div>
            <h1>{tour.name}</h1>
            <p>
              Статус: <span className="page-badge">{STATUS_LABELS[tour.status] || tour.status}</span>
              {tour.simulation_only && (
                <span className="page-badge page-badge--amber" style={{ marginLeft: '0.5rem' }}>
                  Симуляция
                </span>
              )}
            </p>
          </div>
        </header>

        <div className="tours-info-bar">
          <TourIcon name="info" size={18} />
          <span>{tour.disclaimer}</span>
        </div>

        {error && <div className="error">{error}</div>}

        {stats && (
          <div className="tours-card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: '0 0 0.85rem', fontSize: '1rem', fontWeight: 700 }}>Слоты</h2>
            <div className="tours-detail-slots">
              <div className="tours-detail-slot">
                <h3>Бюджет</h3>
                <p>
                  <strong>{stats.budget.joined}</strong>
                  {stats.budget.limit != null ? ` / ${stats.budget.limit}` : ''} занято
                </p>
                {stats.budget.available != null && (
                  <p className="muted">Свободно: {stats.budget.available}</p>
                )}
              </div>
              <div className="tours-detail-slot">
                <h3>Контракт</h3>
                <p>
                  <strong>{stats.contract.joined}</strong>
                  {stats.contract.limit != null ? ` / ${stats.contract.limit}` : ''} занято
                </p>
                {stats.contract.available != null && (
                  <p className="muted">Свободно: {stats.contract.available}</p>
                )}
              </div>
            </div>
            {stats.hold_minutes > 0 && (
              <p className="muted">Удержание места после входа: {stats.hold_minutes} мин.</p>
            )}
            {stats.require_verified_certificate && (
              <p className="muted">Требуется подтверждённый сертификат.</p>
            )}
          </div>
        )}

        {user && tour.status === 'open' && !joined && (
          <div className="tours-card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: '0 0 0.65rem', fontSize: '1rem', fontWeight: 700 }}>Участие</h2>
            {!can_use_tours ? (
              <p className="muted">
                {analysis_blocked_reason === 'scores' ? (
                  <>
                    {t('tours.blocked.scores')}{' '}
                    <Link to="/account/scores">{t('ux.empty.toScores')}</Link>
                  </>
                ) : (
                  <>
                    {t('tours.blocked.subscription')}{' '}
                    <Link to="/subscription">{t('analysis.blocked.subscriptionLink')}</Link>
                  </>
                )}
              </p>
            ) : (
              <>
                <p className="muted">{t('tours.joinHint')}</p>
                <div className="tours-slot-options">
              <label className="tours-slot-option">
                <input
                  type="radio"
                  name="slot"
                  value="budget"
                  checked={slotType === 'budget'}
                  onChange={() => setSlotType('budget')}
                />
                Бюджетный слот
              </label>
              <label className="tours-slot-option">
                <input
                  type="radio"
                  name="slot"
                  value="contract"
                  checked={slotType === 'contract'}
                  onChange={() => setSlotType('contract')}
                />
                Контрактный слот
              </label>
            </div>
            <button type="button" className="btn" disabled={acting} onClick={handleJoin}>
              {acting ? 'Вход...' : 'Присоединиться'}
            </button>
              </>
            )}
          </div>
        )}

        {joined && (
          <div className="tours-card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: '0 0 0.65rem', fontSize: '1rem', fontWeight: 700 }}>Ваше участие</h2>
            <div className="page-meta-row">
              <span className="page-meta-item">
                Слот: <strong>{SLOT_LABELS[tour.own_participation.slot_type] || tour.own_participation.slot_type}</strong>
              </span>
              <span className="page-meta-item">
                Балл: <strong>{tour.own_participation.score_snapshot?.main_score ?? '—'}</strong>
              </span>
              {tour.own_rank && (
                <span className="page-meta-item">
                  Место: <strong>#{tour.own_rank.rank}</strong>
                </span>
              )}
            </div>
            {tour.hold_active && (
              <p className="muted">
                Удержание до {new Date(tour.hold_expires_at).toLocaleTimeString('ru-RU')} — выход временно
                недоступен.
              </p>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={acting || tour.hold_active}
              onClick={handleWithdraw}
            >
              Выйти из тура
            </button>
          </div>
        )}

        {!user && tour.status === 'open' && (
          <div className="page-callout">
            <Link to="/login">Войдите</Link>, чтобы участвовать в туре.
          </div>
        )}

        <div className="tours-card">
          <h2 style={{ margin: '0 0 0.85rem', fontSize: '1rem', fontWeight: 700 }}>Рейтинг тура (топ-30)</h2>
          {!loggedIn || !can_view_rankings || tour.rankings_locked ? (
            <EmptyState
              icon="🔒"
              title={t('tours.rankingsLocked.title')}
              description={!loggedIn ? t('tours.blocked.registerHint') : t('tours.rankingsLocked.text')}
              actionLabel={!loggedIn ? t('ux.empty.toRegister') : t('analysis.blocked.subscriptionLink')}
              actionTo={!loggedIn ? '/register' : '/subscription'}
            />
          ) : (tour.rankingEntries || []).length === 0 ? (
            <EmptyState
              icon="👥"
              title="Пока нет участников"
              description="Будьте первым — присоединитесь к туру, когда он открыт."
              actionLabel="Все туры"
              actionTo="/tours"
            />
          ) : (
            <div className="tours-table-wrap">
              <table className="tours-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Участник</th>
                    <th>Балл</th>
                    <th>Слот</th>
                  </tr>
                </thead>
                <tbody>
                  {tour.rankingEntries.map((row) => (
                    <tr key={row.id}>
                      <td>{row.rank}</td>
                      <td>{row.public_label}</td>
                      <td>{row.score_snapshot?.main_score ?? '—'}</td>
                      <td>{SLOT_LABELS[row.score_snapshot?.slot_type] || row.score_snapshot?.slot_type || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
