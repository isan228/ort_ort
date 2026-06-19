import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { NewsIcon } from '../components/icons/NewsIcons.jsx';
import MobileFilterSheet, { CatalogMobileBar, MobileChipRow } from '../components/ux/MobileFilterSheet.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

const PAGE_SIZE = 5;

const CATEGORIES = [
  { id: '', label: 'Все новости', icon: 'grid' },
  { id: 'admission', label: 'Поступление', icon: 'admission' },
  { id: 'tours', label: 'Туры', icon: 'tours' },
  { id: 'universities', label: 'Вузы', icon: 'universities' },
  { id: 'rules', label: 'Изменения правил', icon: 'rules' },
  { id: 'scholarships', label: 'Стипендии', icon: 'scholarship' },
  { id: 'olympiads', label: 'Олимпиады', icon: 'olympiad' },
  { id: 'events', label: 'Мероприятия', icon: 'events' },
];

const CATEGORY_ALIASES = {
  announcement: 'admission',
  guide: 'rules',
  admission: 'admission',
  tours: 'tours',
  universities: 'universities',
  rules: 'rules',
  scholarships: 'scholarships',
  olympiads: 'olympiads',
  events: 'events',
};

const CATEGORY_LABELS = {
  admission: 'ПОСТУПЛЕНИЕ',
  tours: 'ТУРЫ',
  universities: 'ВУЗЫ',
  rules: 'ПРАВИЛА',
  scholarships: 'СТИПЕНДИИ',
  olympiads: 'ОЛИМПИАДЫ',
  events: 'МЕРОПРИЯТИЯ',
  announcement: 'ПОСТУПЛЕНИЕ',
  guide: 'ГАЙД',
};

const IMPORTANT_DATES = [
  { date: '20 мая', title: 'Подача заявлений на 1-й тур' },
  { date: '15 июн', title: 'Публикация списков зачисленных' },
  { date: '1 авг', title: 'Старт 2-го тура поступления' },
  { date: '25 авг', title: 'Окончание приёма документов' },
];

const REGIONS = ['Все регионы', 'Бишкек', 'Ош', 'Чуй', 'Иссык-Куль', 'Нарын', 'Талас', 'Баткен', 'Жалал-Абад'];

function normalizeCategory(raw) {
  return CATEGORY_ALIASES[raw] || raw || 'admission';
}

function pseudoViews(id) {
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 100000;
  }
  return 1200 + (hash % 4800);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function isImportant(article, index) {
  return article.category === 'announcement' || index === 0;
}

export default function NewsPage() {
  const { t } = useI18n();
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('newest');
  const [importantOnly, setImportantOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [heroIndex, setHeroIndex] = useState(0);
  const [saved, setSaved] = useState(() => new Set());
  const [email, setEmail] = useState('');
  const [subscribeMsg, setSubscribeMsg] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .getNews({ limit: 100 })
      .then((data) => setArticles(data.articles || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const featured = useMemo(() => {
    const important = articles.filter((a, i) => isImportant(a, i));
    return (important.length ? important : articles).slice(0, 3);
  }, [articles]);

  const filtered = useMemo(() => {
    let list = [...articles];

    if (category) {
      list = list.filter((a) => normalizeCategory(a.category) === category);
    }

    if (importantOnly) {
      list = list.filter((a, i) => isImportant(a, articles.indexOf(a)));
    }

    if (tab === 'popular') {
      list.sort((a, b) => pseudoViews(b.id) - pseudoViews(a.id));
    } else if (tab === 'fresh') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      list = list.filter((a) => a.published_at && new Date(a.published_at).getTime() >= weekAgo);
      list.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    } else if (sort === 'oldest') {
      list.sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
    } else {
      list.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    }

    return list;
  }, [articles, category, importantOnly, tab, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const popular = useMemo(() => {
    return [...articles]
      .sort((a, b) => pseudoViews(b.id) - pseudoViews(a.id))
      .slice(0, 5);
  }, [articles]);

  useEffect(() => {
    setPage(1);
  }, [category, tab, sort, importantOnly]);

  useEffect(() => {
    if (!featured.length) return undefined;
    const timer = setInterval(() => {
      setHeroIndex((i) => (i + 1) % featured.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [featured.length]);

  function toggleSave(id, e) {
    e.preventDefault();
    e.stopPropagation();
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubscribe(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribeMsg('Спасибо! Подписка оформлена.');
    setEmail('');
  }

  const hero = featured[heroIndex];
  const activeFilterCount = (importantOnly ? 1 : 0) + (sort !== 'newest' ? 1 : 0);

  const newsFiltersPanel = (
    <>
      <label className="news-check">
        <input
          type="checkbox"
          checked={importantOnly}
          onChange={(e) => setImportantOnly(e.target.checked)}
        />
        Только важные
      </label>
      <label className="news-filter-field">
        <span>Сортировка</span>
        <select className="news-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Новые сверху</option>
          <option value="oldest">Старые сверху</option>
        </select>
      </label>
    </>
  );

  return (
    <div className="news-page">
      <div className="news-page-inner">
        <header className="news-page-head">
          <h1>Новости поступления</h1>
          <p>Актуальная информация о поступлении, изменениях и важных событиях</p>
        </header>

        {error && <div className="error">{error}</div>}

        {hero && (
          <section className="news-featured">
            <Link to={`/news/${hero.slug}`} className="news-featured-card">
              <div className="news-featured-content">
                {isImportant(hero, articles.indexOf(hero)) && (
                  <span className="news-featured-tag">ВАЖНО</span>
                )}
                {hero.published_at && (
                  <time className="news-featured-date">{formatDate(hero.published_at)}</time>
                )}
                <h2>{hero.title}</h2>
                {hero.excerpt && <p>{hero.excerpt}</p>}
                <span className="news-featured-btn">
                  Читать подробнее
                  <NewsIcon name="arrowRight" size={14} />
                </span>
              </div>
              <div className="news-featured-media">
                <NewsIcon name="admission" size={80} />
              </div>
            </Link>
            {featured.length > 1 && (
              <div className="news-featured-dots">
                {featured.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`news-featured-dot${idx === heroIndex ? ' active' : ''}`}
                    aria-label={`Слайд ${idx + 1}`}
                    onClick={() => setHeroIndex(idx)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <div className="news-layout">
          <aside className="news-sidebar-left news-sidebar-left--desktop">
            <div className="news-sidebar-card">
              <h3>Категории</h3>
              <ul className="news-categories">
                {CATEGORIES.map((cat) => (
                  <li key={cat.id || 'all'}>
                    <button
                      type="button"
                      className={`news-cat-btn${category === cat.id ? ' active' : ''}`}
                      onClick={() => setCategory(cat.id)}
                    >
                      <NewsIcon name={cat.icon} size={16} className="news-icon" />
                      {cat.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="news-sidebar-card">
              <h3>Фильтры</h3>
              <label className="news-filter-field">
                <span>Вуз</span>
                <select className="news-select" defaultValue="">
                  <option value="">Все вузы</option>
                </select>
              </label>
              <label className="news-filter-field">
                <span>Регион</span>
                <select className="news-select" defaultValue="">
                  {REGIONS.map((r) => (
                    <option key={r} value={r === 'Все регионы' ? '' : r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="news-check">
                <input
                  type="checkbox"
                  checked={importantOnly}
                  onChange={(e) => setImportantOnly(e.target.checked)}
                />
                Только важные
              </label>
            </div>

            <div className="news-sidebar-card">
              <h3>Архив новостей</h3>
              <div className="news-archive-row">
                <select className="news-select" defaultValue="">
                  <option value="">Выберите месяц</option>
                  <option value="2026-06">Июнь 2026</option>
                  <option value="2026-05">Май 2026</option>
                  <option value="2026-04">Апрель 2026</option>
                </select>
                <button type="button" className="news-archive-btn" aria-label="Календарь">
                  <NewsIcon name="calendar" size={16} />
                </button>
              </div>
            </div>

            <div className="news-promo-card">
              <NewsIcon name="bell" size={28} />
              <p>Не пропускайте важные новости о поступлении</p>
              <Link to="/register" className="btn btn-sm">
                Подписаться
              </Link>
            </div>
          </aside>

          <section className="news-main">
            <MobileChipRow
              items={CATEGORIES}
              value={category}
              onChange={setCategory}
            />

            <CatalogMobileBar
              hideSearch
              search=""
              onSearchChange={() => {}}
              filterCount={activeFilterCount}
              onOpenFilters={() => setFiltersOpen(true)}
              sort={sort}
              onSortChange={setSort}
              sortLabel="Сортировка"
              sortOptions={[
                { value: 'newest', label: 'Новые' },
                { value: 'oldest', label: 'Старые' },
              ]}
            />

            <MobileFilterSheet
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              title={t('ux.filters.title')}
              activeCount={activeFilterCount}
              onReset={() => {
                setImportantOnly(false);
                setSort('newest');
              }}
              onApply={() => setFiltersOpen(false)}
            >
              {newsFiltersPanel}
            </MobileFilterSheet>

            <div className="news-main-card">
              <div className="news-tabs-row">
                <div className="news-tabs">
                  {[
                    { id: 'all', label: 'Все новости' },
                    { id: 'popular', label: 'Популярные' },
                    { id: 'fresh', label: 'Свежие' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`news-tab${tab === item.id ? ' active' : ''}`}
                      onClick={() => setTab(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {tab === 'all' && (
                  <div className="news-sort">
                    <span>Сортировка:</span>
                    <select
                      className="news-select"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="newest">Новые сверху</option>
                      <option value="oldest">Старые сверху</option>
                    </select>
                  </div>
                )}
              </div>

              {loading ? (
                <p className="news-empty">Загрузка...</p>
              ) : (
                <>
                  <div className="news-feed">
                    {pageItems.map((article) => {
                      const cat = normalizeCategory(article.category);
                      const important = isImportant(article, articles.indexOf(article));
                      return (
                        <Link key={article.id} to={`/news/${article.slug}`} className="news-item">
                          <div className={`news-item-thumb news-item-thumb--${cat}`} />
                          <div className="news-item-body">
                            <div className="news-item-tags">
                              {important && (
                                <span className="news-badge news-badge--important">ВАЖНО</span>
                              )}
                              <span className={`news-badge news-badge--${cat}`}>
                                {CATEGORY_LABELS[cat] || CATEGORY_LABELS.admission}
                              </span>
                            </div>
                            <h3>{article.title}</h3>
                            {article.excerpt && <p>{article.excerpt}</p>}
                            <div className="news-item-meta">
                              {article.published_at && (
                                <>
                                  <span>{formatDate(article.published_at)}</span>
                                  <span>{formatTime(article.published_at)}</span>
                                </>
                              )}
                              <span>
                                <NewsIcon name="eye" size={13} />
                                {pseudoViews(article.id).toLocaleString('ru-RU')}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className={`news-item-bookmark${saved.has(article.id) ? ' saved' : ''}`}
                            aria-label="Сохранить"
                            onClick={(e) => toggleSave(article.id, e)}
                          >
                            <NewsIcon name="bookmark" size={18} />
                          </button>
                        </Link>
                      );
                    })}
                  </div>

                  {!pageItems.length && (
                    <p className="news-empty">Новостей по выбранным фильтрам пока нет.</p>
                  )}

                  {totalPages > 1 && (
                    <nav className="news-pagination" aria-label="Пагинация">
                      <button
                        type="button"
                        className="news-page-btn"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        ←
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let num = i + 1;
                        if (totalPages > 5 && page > 3) {
                          num = page - 2 + i;
                          if (num > totalPages) num = totalPages - (4 - i);
                        }
                        return (
                          <button
                            key={num}
                            type="button"
                            className={`news-page-btn${page === num ? ' active' : ''}`}
                            onClick={() => setPage(num)}
                          >
                            {num}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className="news-page-btn"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        →
                      </button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </section>

          <aside className="news-sidebar-right">
            <div className="news-sidebar-card">
              <h3>Важные даты</h3>
              <ul className="news-widget-dates">
                {IMPORTANT_DATES.map((item) => (
                  <li key={item.title}>
                    <span className="news-date-badge">{item.date}</span>
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
              <Link to="/tours" className="news-widget-link">
                Смотреть все даты
                <NewsIcon name="arrowRight" size={14} />
              </Link>
            </div>

            <div className="news-sidebar-card">
              <h3>Популярные новости</h3>
              <ol className="news-popular-list">
                {popular.map((article, idx) => (
                  <li key={article.id}>
                    <span className="news-popular-num">{idx + 1}</span>
                    <Link to={`/news/${article.slug}`}>{article.title}</Link>
                    <span className="news-popular-views">
                      {pseudoViews(article.id).toLocaleString('ru-RU')}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="news-sidebar-card news-newsletter">
              <NewsIcon name="send" size={24} />
              <p>Будьте в курсе всех изменений в правилах поступления</p>
              <form className="news-newsletter-form" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  placeholder="Ваш email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn">
                  Подписаться
                </button>
              </form>
              {subscribeMsg && <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>{subscribeMsg}</p>}
            </div>

            <div className="news-sidebar-card">
              <div className="news-contact-card">
                <NewsIcon name="chat" size={22} />
                <div>
                  <strong>Есть новость?</strong>
                  <p>Сообщите нам о важном событии в сфере образования</p>
                  <Link to="/account/support" className="news-widget-link">
                    Сообщить новость
                    <NewsIcon name="arrowRight" size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
