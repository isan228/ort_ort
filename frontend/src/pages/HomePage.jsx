import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, isAuthenticated } from '../api/client.js';
import { useI18n } from '../i18n/I18nContext.jsx';
import {
  validateOrtMainScore,
} from '../utils/ortScore.js';
import {
  LandingIcon,
  STEP_ICON_NAMES,
  STAT_ICON_NAMES,
  CHANCE_ICON_NAMES,
} from '../components/icons/LandingIcons.jsx';

const DEMO_ROWS = [
  { uni: 'КГМА', program: 'Лечебное дело', chance: 'high', pct: 82 },
  { uni: 'КРСУ', program: 'Лечебное дело', chance: 'high', pct: 91 },
  { uni: 'ОшГУ', program: 'Лечебное дело', chance: 'medium', pct: 64 },
  { uni: 'КГМИ', program: 'Лечебное дело', chance: 'low', pct: 35 },
  { uni: 'КГУ', program: 'Лечебное дело', chance: 'low', pct: 22 },
];

const FEATURE_TILES = [
  { icon: 'chart', color: 'blue', titleKey: 'home.tile.analysis', descKey: 'home.tile.analysisDesc', linkKey: 'home.feature.analysisLink', to: '/analysis' },
  { icon: 'trophy', color: 'green', titleKey: 'home.tile.tours', descKey: 'home.tile.toursDesc', linkKey: 'home.feature.toursLink', to: '/tours' },
  { icon: 'gradCap', color: 'purple', titleKey: 'home.tile.universities', descKey: 'home.tile.universitiesDesc', linkKey: 'home.feature.universitiesLink', to: '/universities' },
  { icon: 'users', color: 'orange', titleKey: 'home.tile.community', descKey: 'home.tile.communityDesc', linkKey: 'home.feature.communityLink', to: '/community' },
  { icon: 'gift', color: 'pink', titleKey: 'home.tile.wallet', descKey: 'home.tile.walletDesc', linkKey: 'home.feature.walletLink', to: '/account/wallet' },
  { icon: 'news', color: 'navy', titleKey: 'home.tile.news', descKey: 'home.tile.newsDesc', linkKey: 'home.feature.newsLink', to: '/news' },
];

function buildPersonas(t, navigate, handleStartAnalysis) {
  return [
    {
      key: '2026',
      tone: 'blue',
      emoji: '🧑‍🎓',
      title: t('home.persona2026.title'),
      desc: t('home.persona2026.desc'),
      bullets: [t('home.persona2026.b1'), t('home.persona2026.b2'), t('home.persona2026.b3')],
      onClick: handleStartAnalysis,
    },
    {
      key: '2027',
      tone: 'green',
      emoji: '📅',
      title: t('home.persona2027.title'),
      desc: t('home.persona2027.desc'),
      bullets: [t('home.persona2027.b1'), t('home.persona2027.b2'), t('home.persona2027.b3')],
      onClick: () => navigate('/universities'),
    },
    {
      key: 'parent',
      tone: 'purple',
      emoji: '👨‍👩‍👧‍👦',
      title: t('home.personaParent.title'),
      desc: t('home.personaParent.desc'),
      bullets: [t('home.personaParent.b1'), t('home.personaParent.b2'), t('home.personaParent.b3')],
      onClick: () => navigate('/register'),
    },
  ];
}

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
  const [direction] = useState('medicine');
  const [programs, setPrograms] = useState([]);
  const [ctaLoading, setCtaLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState(null);

  const stats = useMemo(() => {
    const usersCount = platformStats?.users_count ?? 0;
    const uniCount = platformStats?.universities_count ?? 0;
    const programCount = platformStats?.programs_count ?? 0;

    return [
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
      {
        icon: STAT_ICON_NAMES[3],
        value: usersCount > 0 ? `${formatStatValue(usersCount) || usersCount}` : '200K+',
        label: t('home.stat.students'),
        muted: false,
      },
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
    { num: 5, icon: STEP_ICON_NAMES[4], title: t('home.step5.title'), desc: t('home.step5.desc') },
  ];

  useEffect(() => {
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
    const check = validateOrtMainScore(score);
    if (!check.valid) {
      navigate('/register');
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

  const personas = buildPersonas(t, navigate, handleStartAnalysis);

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

              <div className="landing-hero-cta">
                <button type="button" className="btn btn-landing" disabled={ctaLoading} onClick={handleStartAnalysis}>
                  <span>{ctaLoading ? t('home.ctaLoading') : t('home.ctaFree')}</span>
                  <LandingIcon name="arrowRight" size={18} className="btn-landing-arrow" />
                </button>
                <button type="button" className="btn-landing-outline" onClick={() => navigate('/register')}>
                  <LandingIcon name="user" size={18} />
                  {t('home.parentCta')}
                </button>
              </div>

              <div className="landing-hero-stats landing-desktop-only">
                {stats.map((item) => (
                  <div key={item.label} className="landing-stat">
                    <LandingIcon name={item.icon} size={22} className="landing-stat-svg" />
                    <span className="landing-stat-text">
                      <strong className={item.muted ? 'landing-stat-soon' : undefined}>{item.value}</strong>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
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

              <ul className="landing-example-list landing-mobile-only">
                {DEMO_ROWS.map((row) => (
                  <li key={`${row.uni}-m`} className="landing-example-list-item">
                    <div className="landing-example-list-text">
                      <strong>{row.uni}</strong>
                      <span>{row.program}</span>
                    </div>
                    <ChanceBadge level={row.chance} pct={row.pct} t={t} />
                  </li>
                ))}
              </ul>

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
              <button type="button" className="landing-example-link landing-mobile-only" disabled={ctaLoading} onClick={handleStartAnalysis}>
                {t('home.exampleFullLink')}
                <LandingIcon name="arrowRight" size={14} />
              </button>
              <button type="button" className="landing-example-link--desktop landing-desktop-only" disabled={ctaLoading} onClick={handleStartAnalysis}>
                {t('home.exampleFullLink')}
                <LandingIcon name="arrowRight" size={14} />
              </button>
              <p className="landing-example-disclaimer">{t('home.example.disclaimer')}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="landing-personas">
        <div className="container">
          <h2 className="landing-section-title">{t('home.personasTitle')}</h2>
          <div className="landing-personas-grid">
            {personas.map((persona) => (
              <button
                key={persona.key}
                type="button"
                className={`landing-persona-card landing-persona-card--${persona.tone}`}
                onClick={persona.onClick}
              >
                <div className="landing-persona-main">
                  <div className="landing-persona-body">
                    <h3>{persona.title}</h3>
                    <p className="landing-persona-sub">{persona.desc}</p>
                    <ul className="landing-persona-list">
                      {persona.bullets.map((item) => (
                        <li key={item}>
                          <span className="landing-persona-check" aria-hidden>
                            ✓
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="landing-persona-art" aria-hidden>
                    {persona.emoji}
                  </div>
                </div>
                <span className="landing-persona-arrow" aria-hidden>
                  <LandingIcon name="arrowRight" size={14} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="container">
          <h2 className="landing-section-title">{t('home.featuresTitle')}</h2>
          <div className="landing-features-grid">
            {FEATURE_TILES.map((tile) => (
              <Link key={tile.to} to={tile.to} className="landing-feature-card">
                <span className={`landing-feature-icon landing-feature-icon--${tile.color}`}>
                  <LandingIcon name={tile.icon} size={20} />
                </span>
                <h3>{t(tile.titleKey)}</h3>
                <p>{t(tile.descKey)}</p>
                <span className="landing-feature-link">{t(tile.linkKey)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--how">
        <div className="container">
          <h2 className="landing-section-title">{t('home.howTitle')}</h2>
          <div className="landing-steps landing-steps--mobile">
            {steps.map((step) => (
              <div key={`m-${step.num}`} className="landing-step landing-step--mobile">
                <div className="landing-step-num">{step.num}</div>
                <LandingIcon name={step.icon} size={22} className="landing-step-icon" />
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="landing-steps landing-steps--desktop landing-desktop-only">
            {steps.map((step) => (
              <div key={step.num} className="landing-step landing-step--desktop">
                <div className="landing-step-num">{step.num}</div>
                <LandingIcon name={step.icon} size={28} className="landing-step-icon" />
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-bottom-cta">
        <div className="container">
          <div className="landing-bottom-cta-card landing-mobile-only">
            <LandingIcon name="gradCap" size={36} className="landing-bottom-icon" />
            <p>{t('home.bottomCta')}</p>
            <p className="landing-bottom-cta-sub">{t('home.bottomCtaSub')}</p>
            <button type="button" className="btn btn-landing" disabled={ctaLoading} onClick={handleStartAnalysis}>
              <span>{ctaLoading ? t('home.ctaLoading') : t('home.ctaFree')}</span>
              <LandingIcon name="arrowRight" size={18} className="btn-landing-arrow" />
            </button>
          </div>
          <div className="landing-bottom-cta-banner landing-desktop-only">
            <LandingIcon name="gradCap" size={48} className="landing-bottom-icon" />
            <div className="landing-bottom-cta-text">
              <p>{t('home.bottomCta')}</p>
              <p className="landing-bottom-cta-sub">{t('home.bottomCtaSub')}</p>
            </div>
            <button type="button" className="btn btn-landing" disabled={ctaLoading} onClick={handleStartAnalysis}>
              <span>{ctaLoading ? t('home.ctaLoading') : t('home.ctaFree')}</span>
              <LandingIcon name="arrowRight" size={18} className="btn-landing-arrow" />
            </button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container landing-footer-inner landing-footer-inner--desktop">
          <div className="landing-footer-top">
            <div className="landing-footer-brand">
              <Link to="/" className="landing-footer-logo">
                ORT.KG
              </Link>
              <p className="landing-footer-desc">{t('home.footerDesc')}</p>
              <div className="landing-footer-social">
                <a href="https://t.me/" target="_blank" rel="noreferrer">
                  TG
                </a>
                <a href="https://instagram.com/" target="_blank" rel="noreferrer">
                  IG
                </a>
                <a href="https://youtube.com/" target="_blank" rel="noreferrer">
                  YT
                </a>
                <a href="https://tiktok.com/" target="_blank" rel="noreferrer">
                  TT
                </a>
              </div>
            </div>
            <div className="landing-footer-col">
              <h4>{t('home.footer.platform')}</h4>
              <nav>
                <Link to="/analysis">{t('nav.analysis')}</Link>
                <Link to="/tours">{t('nav.tours')}</Link>
                <Link to="/universities">{t('nav.universities')}</Link>
                <Link to="/rankings">{t('nav.rankings')}</Link>
              </nav>
            </div>
            <div className="landing-footer-col">
              <h4>{t('home.footer.company')}</h4>
              <nav>
                <Link to="/faq">{t('home.footer.about')}</Link>
                <Link to="/account/support">{t('home.footer.contacts')}</Link>
                <Link to="/news">{t('nav.news')}</Link>
                <Link to="/faq">{t('home.footer.team')}</Link>
              </nav>
            </div>
            <div className="landing-footer-col">
              <h4>{t('home.footer.support')}</h4>
              <nav>
                <Link to="/faq">{t('legal.faq')}</Link>
                <Link to="/account/support">{t('home.footer.helpCenter')}</Link>
                <Link to="/account/support">{t('home.footer.feedback')}</Link>
                <Link to="/legal/terms">{t('home.footer.rules')}</Link>
              </nav>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <p className="landing-footer-copy">{t('footer.rights')}</p>
            <div className="landing-footer-legal">
              <Link to="/legal/privacy">{t('legal.privacy')}</Link>
              <Link to="/legal/terms">{t('legal.terms')}</Link>
              <Link to="/legal/offer">{t('legal.offer')}</Link>
            </div>
          </div>
        </div>
        <div className="container landing-footer-inner landing-footer-inner--mobile">
          <div className="landing-footer-brand">
            <Link to="/" className="landing-footer-logo">
              ORT.KG
            </Link>
            <p className="landing-footer-desc">{t('home.footerDesc')}</p>
          </div>
          <div className="landing-footer-social">
            <a href="https://t.me/" target="_blank" rel="noreferrer">
              TG
            </a>
            <a href="https://instagram.com/" target="_blank" rel="noreferrer">
              IG
            </a>
            <a href="https://youtube.com/" target="_blank" rel="noreferrer">
              YT
            </a>
          </div>
          <nav className="landing-footer-links">
            <Link to="/faq">{t('home.footer.about')}</Link>
            <Link to="/account/support">{t('home.footer.contacts')}</Link>
            <Link to="/faq">{t('home.footer.team')}</Link>
            <Link to="/faq">{t('legal.faq')}</Link>
            <Link to="/legal/terms">{t('legal.terms')}</Link>
            <Link to="/legal/privacy">{t('legal.privacy')}</Link>
          </nav>
          <p className="landing-footer-copy">{t('footer.rights')}</p>
        </div>
      </footer>
    </div>
  );
}
