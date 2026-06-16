import { Setting } from '../models/index.js';
import { LEGAL_DOCUMENT_TYPE } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';
import { getSetting, clearSettingsCache } from './settingsService.js';
import { writeAuditLog } from './auditService.js';

const LEGAL_SETTING_KEY = 'legal_documents';

const DEFAULT_LEGAL = {
  [LEGAL_DOCUMENT_TYPE.PRIVACY]: {
    ru: {
      title: 'Политика конфиденциальности',
      body: '<p>ORT.KG обрабатывает персональные данные абитуриентов в соответствии с законодательством Кыргызской Республики, включая требования Цифрового кодекса.</p><p>Мы собираем данные, необходимые для регистрации, анализа шансов и участия в симуляции туров. Сертификаты и баллы хранятся в защищённом контуре и используются только для верификации и расчётов внутри сервиса.</p><p>По вопросам обработки данных обращайтесь в поддержку через личный кабинет.</p>',
    },
    ky: {
      title: 'Купуялык саясаты',
      body: '<p>ORT.KG абитуриенттердин жеке маалыматтарын Кыргыз Республикасынын мыйзамдарына ылайык иштетет.</p><p>Катталуу, шans талдоо жана турларга катышуу үчүн зарыл маалыматтар гана топтолот.</p>',
    },
  },
  [LEGAL_DOCUMENT_TYPE.TERMS]: {
    ru: {
      title: 'Пользовательское соглашение',
      body: '<p>Используя ORT.KG, вы соглашаетесь с правилами сервиса. Платформа предоставляет информационно-аналитические инструменты и не является официальным порталом приёма в вузы.</p><p>Результаты анализа и туров носят симуляционный характер и не гарантируют зачисление.</p>',
    },
    ky: {
      title: 'Колдонуучу келишими',
      body: '<p>ORT.KG колдонуу менен сиз сервистин эрежелерине макул болосуз. Платформа расмiy кабыл алуу порталы эмес.</p>',
    },
  },
  [LEGAL_DOCUMENT_TYPE.OFFER]: {
    ru: {
      title: 'Публичная оферта',
      body: '<p>Настоящая оферта регулирует условия оказания платных услуг Premium-подписки на платформе ORT.KG.</p><p>Оплата производится через подключённые платёжные провайдеры. Возврат средств осуществляется в случаях, предусмотренных законодательством КР.</p>',
    },
    ky: {
      title: 'Жарлык оферта',
      body: '<p>Бул оферта ORT.KG Premium жазылуу кызматтарынын шарттарын жөнгө салат.</p>',
    },
  },
};

function normalizeLocale(locale) {
  return locale === 'ky' ? 'ky' : 'ru';
}

export async function getLegalDocumentsStore() {
  const stored = await getSetting(LEGAL_SETTING_KEY, null);
  if (!stored || typeof stored !== 'object') {
    return structuredClone(DEFAULT_LEGAL);
  }

  return {
    ...structuredClone(DEFAULT_LEGAL),
    ...stored,
  };
}

export async function getLegalDocument(type, locale = 'ru') {
  const normalizedType = type?.toLowerCase();
  if (!Object.values(LEGAL_DOCUMENT_TYPE).includes(normalizedType)) {
    throw createHttpError(404, 'NOT_FOUND', 'Документ не найден');
  }

  const store = await getLegalDocumentsStore();
  const loc = normalizeLocale(locale);
  const doc = store[normalizedType]?.[loc] || store[normalizedType]?.ru;

  if (!doc) {
    throw createHttpError(404, 'NOT_FOUND', 'Документ не найден');
  }

  return {
    type: normalizedType,
    locale: loc,
    title: doc.title,
    body: doc.body,
  };
}

export async function listLegalDocumentsAdmin() {
  return getLegalDocumentsStore();
}

export async function updateLegalDocument(actorId, type, locale, payload) {
  const normalizedType = type?.toLowerCase();
  if (!Object.values(LEGAL_DOCUMENT_TYPE).includes(normalizedType)) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Неизвестный тип документа');
  }

  const loc = normalizeLocale(locale);
  const store = await getLegalDocumentsStore();
  const before = store[normalizedType]?.[loc] || null;

  store[normalizedType] = store[normalizedType] || {};
  store[normalizedType][loc] = {
    title: payload.title || before?.title || normalizedType,
    body: payload.body || '',
  };

  const [row] = await Setting.findOrCreate({
    where: { key: LEGAL_SETTING_KEY },
    defaults: {
      value: store,
      description: 'Юридические документы (privacy, terms, offer) по локалям',
    },
  });

  if (!row.isNewRecord) {
    await row.update({ value: store });
  }

  clearSettingsCache();

  await writeAuditLog({
    actorId,
    actionCode: 'legal.update',
    entityType: 'legal_document',
    entityId: `${normalizedType}:${loc}`,
    before,
    after: store[normalizedType][loc],
  });

  return store[normalizedType][loc];
}

export { DEFAULT_LEGAL, LEGAL_SETTING_KEY };
