import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function HomePage() {
  const { t } = useI18n();

  const tiles = [
    { title: t('home.tile.analysis'), to: '/analysis', desc: t('home.tile.analysisDesc') },
    { title: t('home.tile.tours'), to: '/tours', desc: t('home.tile.toursDesc') },
    { title: t('home.tile.universities'), to: '/universities', desc: t('home.tile.universitiesDesc') },
    { title: t('home.tile.community'), to: '/community', desc: t('home.tile.communityDesc') },
    { title: t('home.tile.wallet'), to: '/account/wallet', desc: t('home.tile.walletDesc') },
    { title: t('home.tile.news'), to: '/news', desc: t('home.tile.newsDesc') },
  ];

  return (
    <>
      <section className="hero">
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
        <p style={{ marginTop: '1rem' }}>
          <Link to="/register" className="btn">
            {t('home.cta')}
          </Link>
        </p>
      </section>

      <section className="tiles">
        {tiles.map((tile) => (
          <Link key={tile.to} to={tile.to} className="tile">
            <h3>{tile.title}</h3>
            <p className="muted">{tile.desc}</p>
          </Link>
        ))}
      </section>
    </>
  );
}
