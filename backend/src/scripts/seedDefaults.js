import {
  Role,
  SubscriptionPlan,
  Setting,
  University,
  Faculty,
  Specialty,
  ProgramRule,
  PassingScoreSnapshot,
  Tour,
  NewsArticle,
  TutorLink,
  FaqItem,
  User,
} from '../models/index.js';
import { Op } from 'sequelize';
import { ROLES, TRUST_LEVEL, TOUR_STATUS, TIMER_MODE, NEWS_STATUS, TUTOR_LINK_PLATFORM, TUTOR_LINK_STATUS } from '../constants/index.js';
import { DEFAULT_LEGAL, LEGAL_SETTING_KEY } from '../services/legalService.js';

const DEFAULT_ROLES = [
  { code: ROLES.USER, name: 'Пользователь' },
  { code: ROLES.MANAGER, name: 'Менеджер' },
  { code: ROLES.TUTOR, name: 'Тьютор' },
  { code: ROLES.ADMIN, name: 'Администратор' },
  { code: ROLES.SUPERADMIN, name: 'Суперадмин' },
];

const DEFAULT_PLANS = [
  {
    code: 'premium',
    title: 'Premium',
    description: 'Полный доступ к анализу шансов, сравнению, турам и расширенному каталогу',
    price_kgs: 950,
    duration_days: 180,
    features: [
      'Мультипрограммный анализ шансов',
      'Сравнение вариантов поступления',
      'Участие в турах',
      'Расширенный каталог вузов',
    ],
    sort_order: 1,
    is_active: true,
  },
];

const DEFAULT_SETTINGS = [
  {
    key: 'auth_login_mode',
    value: 'phone_or_email',
    description: 'Режим входа: phone | email | phone_or_email',
  },
  {
    key: 'ort_results_published',
    value: true,
    description: 'Результаты ОРТ опубликованы (сайт в полном режиме)',
  },
  {
    key: 'trial_analyses_limit',
    value: 0,
    description: 'Количество бесплатных анализов на пользователя (0 — отключено)',
  },
  {
    key: 'timezone',
    value: 'Asia/Bishkek',
    description: 'Часовой пояс платформы',
  },
  {
    key: 'algorithm_version',
    value: 'v2-6factor',
    description: 'Текущая версия алгоритма анализа',
  },
  {
    key: 'analysis_weights',
    value: {
      threshold_gap: 0.25,
      subject_compliance: 0.2,
      budget_cutoff_gap: 0.2,
      contract_cutoff_gap: 0.15,
      competition: 0.1,
      data_trust: 0.1,
    },
    description: 'Веса 6 факторов алгоритма анализа',
  },
  {
    key: 'redemption_rules',
    value: {
      referral_reward_bonus: 50,
      referred_user_bonus: 50,
      subscription_discount_max_percent: 50,
      costs: {
        extra_analysis: 50,
        compare_unlock: 30,
        tour_unlock: 100,
      },
    },
    description: 'Правила начисления и списания бонусов',
  },
  {
    key: LEGAL_SETTING_KEY,
    value: DEFAULT_LEGAL,
    description: 'Юридические документы (privacy, terms, offer) по локалям',
  },
];

async function seedCatalog() {
  const [uni] = await University.findOrCreate({
    where: { slug: 'ksucta' },
    defaults: {
      name: 'КГТУ им. Р. Скрябина',
      type: 'государственный',
      city: 'Бишкек',
      description: 'Технический вуз Кыргызстана',
      official_site: 'https://kstu.kg',
      is_featured: true,
      sort_order: 1,
    },
  });

  const [faculty] = await Faculty.findOrCreate({
    where: { university_id: uni.id, slug: 'it' },
    defaults: {
      name: 'Факультет информационных технологий',
      description: 'IT-направления и программная инженерия',
    },
  });

  const [specialty] = await Specialty.findOrCreate({
    where: { faculty_id: faculty.id, slug: 'software-engineering' },
    defaults: {
      name: 'Программная инженерия',
      profession_description: 'Разработка и сопровождение ПО',
      contract_cost: 45000,
    },
  });

  const [rule] = await ProgramRule.findOrCreate({
    where: { specialty_id: specialty.id, season_year: 2026 },
    defaults: {
      ort_required: true,
      main_score_min: 110,
      subject_requirements_json: { math: 50, kyrgyz: 45 },
      extra_exam_required: false,
      source_url: 'https://example.gov.kg/admission',
      trust_level: TRUST_LEVEL.HIGH,
    },
  });

  await PassingScoreSnapshot.findOrCreate({
    where: { program_rule_id: rule.id, year: 2025 },
    defaults: {
      budget_cutoff: 185.5,
      contract_cutoff: 162.0,
      seats_budget: 25,
      seats_contract: 40,
      trust_level: TRUST_LEVEL.MEDIUM,
    },
  });

  const [specialty2] = await Specialty.findOrCreate({
    where: { faculty_id: faculty.id, slug: 'information-systems' },
    defaults: {
      name: 'Информационные системы',
      profession_description: 'Прикладная информатика и системный анализ',
      contract_cost: 38000,
    },
  });

  const [rule2] = await ProgramRule.findOrCreate({
    where: { specialty_id: specialty2.id, season_year: 2026 },
    defaults: {
      ort_required: true,
      main_score_min: 95,
      subject_requirements_json: { math: 45, kyrgyz: 40 },
      extra_exam_required: false,
      source_url: 'https://example.gov.kg/admission',
      trust_level: TRUST_LEVEL.MEDIUM,
    },
  });

  await PassingScoreSnapshot.findOrCreate({
    where: { program_rule_id: rule2.id, year: 2025 },
    defaults: {
      budget_cutoff: 158.0,
      contract_cutoff: 140.0,
      seats_budget: 35,
      seats_contract: 50,
      trust_level: TRUST_LEVEL.MEDIUM,
    },
  });
}

export async function seedDefaults() {
  for (const role of DEFAULT_ROLES) {
    await Role.findOrCreate({
      where: { code: role.code },
      defaults: { ...role, is_system: true },
    });
  }

  for (const plan of DEFAULT_PLANS) {
    const [row] = await SubscriptionPlan.findOrCreate({
      where: { code: plan.code },
      defaults: plan,
    });
    await row.update(plan);
  }

  await SubscriptionPlan.update(
    { is_active: false },
    { where: { code: { [Op.notIn]: DEFAULT_PLANS.map((p) => p.code) } } }
  );

  for (const setting of DEFAULT_SETTINGS) {
    const [row] = await Setting.findOrCreate({
      where: { key: setting.key },
      defaults: setting,
    });
    if (setting.key === 'trial_analyses_limit') {
      await row.update({ value: 0 });
    }
  }

  await User.update({ trial_analyses_limit: 0 });

  await seedCatalog();
  await seedTour();
  await seedNews();
  await seedFaq();
  await seedTutorLinks();

  console.log('Default roles, plans, settings, catalog, tour, news, faq and tutor links seeded');
}

async function seedTutorLinks() {
  await TutorLink.findOrCreate({
    where: { title: 'ORT.KG — общий чат' },
    defaults: {
      platform: TUTOR_LINK_PLATFORM.TELEGRAM,
      url: 'https://t.me/example',
      description: 'Обсуждение поступления и вопросы по ORT',
      responsible_tutor: 'Команда ORT.KG',
      program_scope: 'Общий',
      status: TUTOR_LINK_STATUS.ACTIVE,
      sort_order: 1,
    },
  });
}

async function seedTour() {
  const now = new Date();
  const ends = new Date(now);
  ends.setDate(ends.getDate() + 30);

  await Tour.findOrCreate({
    where: { name: 'Глобальный тур MVP 2026' },
    defaults: {
      status: TOUR_STATUS.OPEN,
      timer_mode: TIMER_MODE.GLOBAL,
      starts_at: now,
      ends_at: ends,
      settings_json: {
        simulation_only: true,
        disclaimer: 'Симуляция, не официальная подача',
        budget_slots: 50,
        contract_slots: 100,
        hold_minutes: 15,
        require_verified_certificate: false,
      },
    },
  });

  const tour = await Tour.findOne({ where: { name: 'Глобальный тур MVP 2026' } });
  if (tour) {
    await tour.update({
      status: TOUR_STATUS.OPEN,
      settings_json: {
        simulation_only: true,
        disclaimer: 'Симуляция, не официальная подача',
        budget_slots: 50,
        contract_slots: 100,
        hold_minutes: 15,
        require_verified_certificate: false,
      },
    });
  }
}

async function seedNews() {
  await NewsArticle.findOrCreate({
    where: { slug: 'welcome-ort-kg' },
    defaults: {
      title: 'Добро пожаловать в ORT.KG',
      excerpt: 'Платформа поддержки абитуриента запущена в тестовом режиме',
      body: '<p>ORT.KG помогает анализировать шансы поступления, изучать каталог вузов и участвовать в симуляции туров.</p>',
      category: 'announcement',
      status: NEWS_STATUS.PUBLISHED,
      published_at: new Date(),
    },
  });

  await NewsArticle.findOrCreate({
    where: { slug: 'how-analysis-works' },
    defaults: {
      title: 'Как работает анализ шансов',
      excerpt: 'Шесть факторов оценки и альтернативы при низком прогнозе',
      body: '<p>Алгоритм v2 учитывает порог программы, предметные требования, исторические проходные баллы, конкурс и достоверность данных.</p><p>Это не гарантия зачисления — инструмент для принятия решений.</p>',
      category: 'guide',
      status: NEWS_STATUS.PUBLISHED,
      published_at: new Date(),
    },
  });
}

async function seedFaq() {
  const faqSeed = [
    {
      category: 'general',
      locale: 'ru',
      question: 'ORT.KG — это официальный портал приёма?',
      answer:
        '<p>Нет. ORT.KG — информационно-аналитический сервис для абитуриентов. Официальная подача документов проходит через государственные порталы.</p>',
      sort_order: 1,
    },
    {
      category: 'general',
      locale: 'ru',
      question: 'Сколько стоит Premium?',
      answer:
        '<p>На платформе один тариф Premium — 950 сом. Он открывает полный анализ шансов, сравнение программ, туры и расширенный каталог.</p>',
      sort_order: 2,
    },
    {
      category: 'scores',
      locale: 'ru',
      question: 'Можно ли изменить баллы после фиксации?',
      answer:
        '<p>После фиксации баллы блокируются. Доступен запрос на исправление через личный кабинет — решение принимает модератор.</p>',
      sort_order: 3,
    },
    {
      category: 'general',
      locale: 'ky',
      question: 'ORT.KG — расмiy кабыл алуу порталыбы?',
      answer:
        '<p>Жок. ORT.KG — абитуриенттер үчүн маалыматтык-аналитикалык сервис. Рasmiy документтер мамлекеттик порталдар аркылуу тапшырылат.</p>',
      sort_order: 1,
    },
  ];

  for (const item of faqSeed) {
    await FaqItem.findOrCreate({
      where: { locale: item.locale, question: item.question },
      defaults: item,
    });
  }
}
