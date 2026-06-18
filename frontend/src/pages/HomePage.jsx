import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';

const CATEGORY_LABELS = {
  announcement: 'home.news.announcement',
  guide: 'home.news.guide',
};

const DEMO_ROWS = [
  { uni: 'КГМА', program: 'Медицина', chance: 'high' },
  { uni: 'КРСУ', program: 'Экономика', chance: 'medium' },
  { uni: 'КГУ', program: 'Юриспруденция', chance: 'low' },
];

const DIRECTION_ICONS = ['🩺', '🦷', '💻', '📊', '⚖️'];

function getUniInitials(name = '') {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
}

function ChanceBadge({ level, t }) {
  const labels = {
    high: t('analysis.chance.high'),
    medium: t('analysis.chance.medium'),
    low: t('analysis.chance.low'),
  };
  return <span className={`landing-chance landing-chance--${level}`}>{labels[level]}</span>;
}

export default function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [score, setScore] = useState('180');
  const [direction, setDirection] = useState('');
  const [universities, setUniversities] = useState([]);
  const [news, setNews] = useState([]);
  const [programs, setPrograms] = useState([]);

  const directions = [
    { key: 'medicine', icon: DIRECTION_ICONS[0], chance: 78 },
    { key: 'dentistry', icon: DIRECTION_ICONS[1], chance: 65 },
    { key: 'it', icon: DIRECTION_ICONS[2], chance: 82 },
    { key: 'economics', icon: DIRECTION_ICONS[3], chance: 71 },
    { key: 'law', icon: DIRECTION_ICONS[4], chance: 58 },
  ];

  const stats = [
    { icon: '🏛', value: '50+', label: t('home.stat.universities') },
    { icon: '📚', value: '500+', label: t('home.stat.programs') },
    { icon: '📈', value: '5', label: t('home.stat.years') },
    { icon: '👥', value: '200K+', label: t('home.stat.students') },
    { icon: '🏆', value: '№1', label: t('home.stat.service') },
  ];

  const steps = [
    { num: 1, icon: '📝', title: t('home.step1.title'), desc: t('home.step1.desc') },
    { num: 2, icon: '📊', title: t('home.step2.title'), desc: t('home.step2.desc') },
    { num: 3, icon: '⚖️', title: t('home.step3.title'), desc: t('home.step3.desc') },
    { num: 4, icon: '🎓', title: t('home.step4.title'), desc: t('home.step4.desc') },
  ];

  useEffect(() => {
    api.getUniversities().then((data) => setUniversities((data.universities || []).slice(0, 5))).catch(() => {});
    api.getNews({ limit: 4 }).then((data) => setNews(data.articles || [])).catch(() => {});
    api.listPrograms().then((data) => setPrograms((data.programs || []).slice(0, 20))).catch(() => {});
  }, []);

  function handleStartAnalysis(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (score) params.set('score', score);
    if (direction) params.set('program', direction);
    const q = params.toString();
    navigate(q ? `/analysis?${q}` : '/analysis');
  }

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="container landing-hero-grid">
          <div className="landing-hero-copy">
            <h1>{t('home.heroTitle')}</h1>
            <form className="landing-hero-form" onSubmit={handleStartAnalysis}>
              <div className="landing-form-row">
                <label>
                  <span>{t('home.scoreLabel')}</span>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="180"
                  />
                </label>
                <label>
                  <span>{t('home.directionLabel')}</span>
                  <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                    <option value="">{t('home.directionPlaceholder')}</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                    {directions.map((d) => (
                      <option key={d.key} value={d.key}>
                        {t(`home.direction.${d.key}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button type="submit" className="btn btn-landing">
                {t('home.ctaFree')}
              </button>
            </form>
          </div>

          <div className="landing-example-card">
            <h3>{t('home.exampleTitle')}</h3>
            <table className="landing-example-table">
              <thead>
                <tr>
                  <th>{t('home.example.col.uni')}</th>
                  <th>{t('home.example.col.program')}</th>
                  <th>{t('home.example.col.chance')}</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_ROWS.map((row) => (
                  <tr key={`${row.uni}-${row.program}`}>
                    <td>{row.uni}</td>
                    <td>{row.program}</td>
                    <td>
                      <ChanceBadge level={row.chance} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="landing-stats">
        <div className="container landing-stats-grid">
          {stats.map((item) => (
            <div key={item.label} className="landing-stat">
              <span className="landing-stat-icon" aria-hidden>
                {item.icon}
              </span>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <h2 className="landing-section-title">{t('home.howTitle')}</h2>
          <div className="landing-steps">
            {steps.map((step) => (
              <div key={step.num} className="landing-step">
                <div className="landing-step-num">{step.num}</div>
                <span className="landing-step-icon" aria-hidden>
                  {step.icon}
                </span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--muted">
        <div className="container">
          <h2 className="landing-section-title">{t('home.directionsTitle')}</h2>
          <div className="landing-cards-grid">
            {directions.map((dir) => (
              <Link key={dir.key} to="/analysis" className="landing-card landing-direction-card">
                <span className="landing-direction-icon" aria-hidden>
                  {dir.icon}
                </span>
                <h3>{t(`home.direction.${dir.key}`)}</h3>
                <p className="muted">{t('home.avgScore')}: 165</p>
                <p className="muted">{t('home.competition')}: 4.2 : 1</p>
                <span className="landing-best-chance">
                  {t('home.bestChance')}: {dir.chance}%
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <h2 className="landing-section-title">{t('home.universitiesTitle')}</h2>
          <div className="landing-cards-grid">
            {(universities.length ? universities : [{ id: 'placeholder', name: 'КГТУ им. Р. Скрябина', slug: 'ksucta', city: 'Бишкек' }]).map(
              (uni) => (
                <Link key={uni.id} to={`/universities/${uni.slug}`} className="landing-card landing-uni-card">
                  <div className="landing-uni-logo">{getUniInitials(uni.name)}</div>
                  <h3>{uni.name}</h3>
                  <p className="muted">{uni.city}</p>
                  <p className="muted">{t('home.programsCount')}: 2+</p>
                  <p className="muted">{t('home.avgScore')}: 158</p>
                  <span className="landing-uni-link">{t('home.more')}</span>
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--muted">
        <div className="container">
          <h2 className="landing-section-title">{t('home.newsTitle')}</h2>
          <div className="landing-news-grid">
            {(news.length ? news : []).map((article) => (
              <Link key={article.id} to={`/news/${article.slug}`} className="landing-card landing-news-card">
                <div className="landing-news-thumb" />
                <div className="landing-news-body">
                  <div className="landing-news-meta">
                    {article.category && (
                      <span className="landing-news-tag">
                        {t(CATEGORY_LABELS[article.category] || 'home.news.default')}
                      </span>
                    )}
                    {article.published_at && (
                      <span className="muted">
                        {new Date(article.published_at).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                  </div>
                  <h3>{article.title}</h3>
                  {article.excerpt && <p className="muted">{article.excerpt}</p>}
                </div>
              </Link>
            ))}
            {!news.length && (
              <p className="muted">{t('home.newsEmpty')}</p>
            )}
          </div>
          {news.length > 0 && (
            <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link to="/news" className="landing-uni-link">
                {t('home.allNews')}
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="landing-bottom-cta">
        <div className="container landing-bottom-cta-inner">
          <span className="landing-bottom-icon" aria-hidden>
            🎓
          </span>
          <p>{t('home.bottomCta')}</p>
          <Link to="/register" className="btn btn-landing">
            {t('home.ctaFree')}
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container landing-footer-inner">
          <span className="muted">{t('footer.rights')}</span>
          <nav className="footer-nav">
            <Link to="/legal/privacy">{t('legal.privacy')}</Link>
            <Link to="/legal/terms">{t('legal.terms')}</Link>
            <Link to="/legal/offer">{t('legal.offer')}</Link>
            <Link to="/faq">{t('legal.faq')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
