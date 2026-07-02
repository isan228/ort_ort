import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, isAuthenticated } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import {
  ORT_MAIN_SCORE_MIN,
  ORT_MAIN_SCORE_MAX,
  validateOrtMainScore,
  getOrtScoreErrorMessage,
} from '../utils/ortScore.js';
import {
  LandingIcon,
  DIRECTION_ICON_NAMES,
  STEP_ICON_NAMES,
  STAT_ICON_NAMES,
  CHANCE_ICON_NAMES,
} from '../components/icons/LandingIcons.jsx';
import UniLogo from '../components/UniLogo.jsx';

const CATEGORY_LABELS = {
  announcement: 'home.news.announcement',
  guide: 'home.news.guide',
};

const DEMO_ROWS = [
  { uni: 'КГМА', program: 'Лечебное дело', chance: 'high', pct: 82 },
  { uni: 'КРСУ', program: 'Лечебное дело', chance: 'high', pct: 91 },
  { uni: 'ОшГУ', program: 'Лечебное дело', chance: 'medium', pct: 64 },
  { uni: 'КГМИ', program: 'Лечебное дело', chance: 'low', pct: 35 },
  { uni: 'КГУ', program: 'Лечебное дело', chance: 'low', pct: 22 },
];

function formatStatValue(count) {
  if (count == null || count <= 0) return null;
  if (count >= 1000) return `${Math.floor(count / 100) * 100}+`;
  if (count >= 10) return `${Math.floor(count / 10) * 10}+`;
  return String(count);
}

function ChanceBadge({ level, pct, t }) {
  const labels = {
    high: t('analysis.chance.high'),
    medium: t('analysis.chance.medium'),
    low: t('analysis.chance.low'),
  };
  return (
    <span className={`landing-chance landing-chance--${level}`}>
      <LandingIcon name={CHANCE_ICON_NAMES[level]} size={12} className="landing-chance-icon" />
      {labels[level]} {pct}%
    </span>
  );
}

export default function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [score, setScore] = useState('185');
  const [direction, setDirection] = useState('medicine');
  const [universities, setUniversities] = useState([]);
  const [news, setNews] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [scoreError, setScoreError] = useState('');
  const [ctaLoading, setCtaLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState(null);

  const directionKeys = ['medicine', 'dentistry', 'it', 'economics', 'law'];
  const directions = directionKeys.map((key, i) => ({
    key,
    icon: DIRECTION_ICON_NAMES[i],
    chance: [78, 65, 82, 71, 58][i],
  }));

  const stats = useMemo(() => {
    const usersCount = platformStats?.users_count ?? 0;
    const uniCount = platformStats?.universities_count ?? 0;
    const programCount = platformStats?.programs_count ?? 0;

    return [
      {
        icon: STAT_ICON_NAMES[3],
        value: usersCount > 0 ? String(usersCount) : '—',
        label: t('home.stat.users'),
      },
      {
        icon: STAT_ICON_NAMES[0],
        value: formatStatValue(uniCount) || t('home.stat.soon'),
        label: t('home.stat.universities'),
        muted: !formatStatValue(uniCount),
      },
      {
        icon: STAT_ICON_NAMES[1],
        value: formatStatValue(programCount) || t('home.stat.soon'),
        label: t('home.stat.programs'),
        muted: !formatStatValue(programCount),
      },
      { icon: STAT_ICON_NAMES[2], value: '5', label: t('home.stat.years') },
      { icon: STAT_ICON_NAMES[4], value: '№1', label: t('home.stat.service') },
    ];
  }, [platformStats, t]);

  function getDirectionLabel(value) {
    if (!value) return t('home.direction.medicineFull');
    const program = programs.find((p) => p.slug === value);
    if (program) return program.name;
    if (value === 'medicine') return t('home.direction.medicineFull');
    return t(`home.direction.${value}`);
  }

  const steps = [
    { num: 1, icon: STEP_ICON_NAMES[0], title: t('home.step1.title'), desc: t('home.step1.desc') },
    { num: 2, icon: STEP_ICON_NAMES[1], title: t('home.step2.title'), desc: t('home.step2.desc') },
    { num: 3, icon: STEP_ICON_NAMES[2], title: t('home.step3.title'), desc: t('home.step3.desc') },
    { num: 4, icon: STEP_ICON_NAMES[3], title: t('home.step4.title'), desc: t('home.step4.desc') },
  ];

  useEffect(() => {
    api.getUniversities().then((data) => setUniversities((data.universities || []).slice(0, 5))).catch(() => {});
    api.getNews({ limit: 4 }).then((data) => setNews(data.articles || [])).catch(() => {});
    api.listPrograms().then((data) => setPrograms((data.programs || []).slice(0, 20))).catch(() => {});
    api.getPublicStats().then(setPlatformStats).catch(() => {});
  }, []);

  async function goToAnalysis(searchQuery = '') {
    const target = searchQuery ? `/analysis?${searchQuery}` : '/analysis';

    if (!isAuthenticated()) {
      navigate('/register');
      return;
    }

    try {
      const ctx = await api.getAnalysisContext();
      const hasAccess = Boolean(ctx.premium);
      navigate(hasAccess ? target : '/subscription');
    } catch {
      navigate('/subscription');
    }
  }

  async function handleStartAnalysis(e) {
    e?.preventDefault?.();
    setScoreError('');
    const check = validateOrtMainScore(score);
    if (!check.valid) {
      setScoreError(getOrtScoreErrorMessage(check.error, t));
      return;
    }

    const params = new URLSearchParams();
    params.set('score', String(check.value));
    if (direction) params.set('program', direction);

    setCtaLoading(true);
    try {
      await goToAnalysis(params.toString());
    } finally {
      setCtaLoading(false);
    }
  }

  async function handleDirectionClick(e) {
    e.preventDefault();
    setCtaLoading(true);
    try {
      await goToAnalysis('');
    } finally {
      setCtaLoading(false);
    }
  }

  return (
    <div className="landing">
      <div className="landing-hero-wrap">
        <section className="landing-hero">
          <div className="container landing-hero-grid">
            <div className="landing-hero-copy">
              <h1>
                {t('home.heroTitleStart')}{' '}
                <span className="landing-hero-accent">{t('home.heroTitleAccent')}</span>
              </h1>
              <p className="landing-hero-subtitle">{t('home.heroSubtitle')}</p>

              <form className="landing-hero-form" onSubmit={handleStartAnalysis}>
                <h2 className="landing-form-title">{t('home.formTitle')}</h2>
                <div className="landing-form-row">
                  <label>
                    <span>{t('home.scoreLabel')}</span>
                    <input
                      type="number"
                      min={ORT_MAIN_SCORE_MIN}
                      max={ORT_MAIN_SCORE_MAX}
                      value={score}
                      onChange={(e) => {
                        setScore(e.target.value);
                        setScoreError('');
                      }}
                      placeholder="185"
                    />
                  </label>
                  {scoreError && <p className="landing-form-score-error">{scoreError}</p>}
                  <label>
                    <span>{t('home.directionLabel')}</span>
                    <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                      <option value="medicine">{t('home.direction.medicineFull')}</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.slug}>
                          {p.name}
                        </option>
                      ))}
                      {directions
                        .filter((d) => d.key !== 'medicine')
                        .map((d) => (
                          <option key={d.key} value={d.key}>
                            {t(`home.direction.${d.key}`)}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                <button type="submit" className="btn btn-landing" disabled={ctaLoading}>
                  <span>{ctaLoading ? t('home.ctaLoading') : t('home.ctaAnalysis')}</span>
                  <LandingIcon name="arrowRight" size={18} className="btn-landing-arrow" />
                </button>
                <p className="landing-form-note">
                  <LandingIcon name="shield" size={16} className="landing-form-shield" />
                  {t('home.formNote')}
                </p>
              </form>
            </div>

            <div className="landing-example-card">
              <h3>{t('home.exampleTitle')}</h3>
              <div className="landing-example-meta">
                <span>
                  {t('home.example.score')}: <strong>{score || '185'}</strong>
                  <LandingIcon name="edit" size={12} className="landing-edit-icon" />
                </span>
                <span>
                  {t('home.example.direction')}: <strong>{getDirectionLabel(direction)}</strong>
                  <LandingIcon name="edit" size={12} className="landing-edit-icon" />
                </span>
              </div>
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
                        <ChanceBadge level={row.chance} pct={row.pct} t={t} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="landing-example-disclaimer">{t('home.example.disclaimer')}</p>
            </div>
          </div>
        </section>

        <section className="landing-stats">
          <div className="container landing-stats-grid">
            {stats.map((item) => (
              <div key={item.label} className="landing-stat">
                <LandingIcon name={item.icon} size={22} className="landing-stat-svg" />
                <span className="landing-stat-text">
                  <strong className={item.muted ? 'landing-stat-soon' : undefined}>{item.value}</strong> {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="landing-section">
        <div className="container">
          <h2 className="landing-section-title">{t('home.howTitle')}</h2>
          <div className="landing-steps">
            {steps.map((step) => (
              <div key={step.num} className="landing-step">
                <div className="landing-step-num">{step.num}</div>
                <LandingIcon name={step.icon} size={28} className="landing-step-icon" />
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
              <a
                key={dir.key}
                href="/analysis"
                className="landing-card landing-direction-card"
                onClick={handleDirectionClick}
              >
                <LandingIcon name={dir.icon} size={28} className="landing-direction-icon" />
                <h3>{t(`home.direction.${dir.key}`)}</h3>
                <p className="muted">{t('home.avgScore')}: 165</p>
                <p className="muted">{t('home.competition')}: 4.2 : 1</p>
                <span className="landing-best-chance">
                  {t('home.bestChance')}: {dir.chance}%
                </span>
              </a>
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
                  <UniLogo name={uni.name} logoUrl={uni.logo_url} size={48} className="landing-uni-logo" />
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
            {!news.length && <p className="muted">{t('home.newsEmpty')}</p>}
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
          <LandingIcon name="gradCap" size={36} className="landing-bottom-icon" />
          <p>{t('home.bottomCta')}</p>
          <button type="button" className="btn btn-landing btn-landing--inline" disabled={ctaLoading} onClick={handleStartAnalysis}>
            <span>{ctaLoading ? t('home.ctaLoading') : t('home.ctaAnalysis')}</span>
            <LandingIcon name="arrowRight" size={18} className="btn-landing-arrow" />
          </button>
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
