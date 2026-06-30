import { Tour, TourParticipation, RankingEntry, User, Profile, ScoreProfile, Certificate } from '../models/index.js';
import {
  TOUR_STATUS,
  PARTICIPATION_STATUS,
  SCORE_MODE,
  CERTIFICATE_STATUS,
  PUBLIC_DISPLAY_MODE,
  TOUR_SLOT_TYPE,
} from '../constants/index.js';
import { userHasActiveSubscription } from './subscriptionService.js';
import { consumeUnlock } from './accessService.js';
import { getUserFeatureAccess } from './featureAccessService.js';
import { REDEMPTION_FEATURE } from '../constants/index.js';
import { createHttpError } from '../utils/errors.js';
import { sequelize } from '../config/database.js';

function getPublicLabel(profile) {
  if (!profile) return 'anonymous';
  if (profile.public_display_mode === PUBLIC_DISPLAY_MODE.CERTIFICATE_NUMBER && profile.certificate_number) {
    return profile.certificate_number;
  }
  return profile.nickname || 'user';
}

function getTourSettings(tour) {
  return tour.settings_json || {};
}

async function getSlotStats(tourId, settings) {
  const participations = await TourParticipation.findAll({
    where: { tour_id: tourId, status: PARTICIPATION_STATUS.JOINED },
    attributes: ['slot_type'],
  });

  const joined = {
    budget: participations.filter((p) => p.slot_type === TOUR_SLOT_TYPE.BUDGET).length,
    contract: participations.filter((p) => p.slot_type === TOUR_SLOT_TYPE.CONTRACT).length,
  };

  return {
    budget: {
      joined: joined.budget,
      limit: settings.budget_slots ?? null,
      available:
        settings.budget_slots != null ? Math.max(0, settings.budget_slots - joined.budget) : null,
    },
    contract: {
      joined: joined.contract,
      limit: settings.contract_slots ?? null,
      available:
        settings.contract_slots != null ? Math.max(0, settings.contract_slots - joined.contract) : null,
    },
    hold_minutes: settings.hold_minutes ?? 0,
    require_verified_certificate: Boolean(settings.require_verified_certificate),
  };
}

export async function listToursPublic() {
  const tours = await Tour.findAll({
    order: [['starts_at', 'DESC']],
    attributes: ['id', 'name', 'status', 'starts_at', 'ends_at', 'settings_json'],
  });

  const enriched = [];
  for (const tour of tours) {
    const settings = getTourSettings(tour);
    const slotStats = await getSlotStats(tour.id, settings);
    enriched.push({
      ...tour.toJSON(),
      simulation_only: true,
      slot_stats: slotStats,
    });
  }

  return enriched;
}

export async function getTourDetail(tourId, userId = null) {
  const tour = await Tour.findByPk(tourId, {
    include: [
      {
        model: RankingEntry,
        as: 'rankingEntries',
        limit: 30,
        order: [['rank', 'ASC']],
      },
    ],
  });

  if (!tour) throw createHttpError(404, 'NOT_FOUND', 'Тур не найден');

  const settings = getTourSettings(tour);
  const slotStats = await getSlotStats(tourId, settings);

  const json = tour.toJSON();
  const rankingEntries = json.rankingEntries || [];
  json.simulation_only = true;
  json.disclaimer = settings.disclaimer || 'Симуляция. Не является официальной подачей заявления.';
  json.slot_stats = slotStats;
  json.rankings_locked = true;
  json.rankingEntries = [];

  if (userId) {
    const access = await getUserFeatureAccess(userId);
    json.access = {
      premium: access.premium,
      can_use_tours: access.can_use_tours,
      can_view_rankings: access.can_view_rankings,
    };

    if (access.can_view_rankings) {
      json.rankingEntries = rankingEntries;
      json.rankings_locked = false;
    }

    const own = await TourParticipation.findOne({
      where: { tour_id: tourId, user_id: userId, status: PARTICIPATION_STATUS.JOINED },
    });
    const ownRank = await RankingEntry.findOne({ where: { tour_id: tourId, user_id: userId } });

    json.own_participation = own;
    json.own_rank = ownRank;

    if (own?.score_snapshot?.hold_expires_at) {
      const holdExpires = new Date(own.score_snapshot.hold_expires_at);
      json.hold_active = holdExpires > new Date();
      json.hold_expires_at = own.score_snapshot.hold_expires_at;
    } else {
      json.hold_active = false;
    }
  }

  return json;
}

async function assertCertificateEligible(userId, settings) {
  if (!settings.require_verified_certificate) return;

  const certificate = await Certificate.findOne({ where: { user_id: userId } });
  if (!certificate || certificate.status !== CERTIFICATE_STATUS.VERIFIED) {
    throw createHttpError(400, 'TOUR-004', 'Для участия нужен подтверждённый сертификат');
  }
}

async function assertSlotAvailable(tourId, slotType, settings) {
  const limitKey = slotType === TOUR_SLOT_TYPE.BUDGET ? 'budget_slots' : 'contract_slots';
  const limit = settings[limitKey];
  if (limit == null) return;

  const joined = await TourParticipation.count({
    where: {
      tour_id: tourId,
      slot_type: slotType,
      status: PARTICIPATION_STATUS.JOINED,
    },
  });

  if (joined >= limit) {
    throw createHttpError(400, 'TOUR-005', 'Свободных мест в этом слоте больше нет');
  }
}

async function getEligibleScoreSnapshot(userId, settings) {
  const profiles = await ScoreProfile.findAll({
    where: { user_id: userId },
    order: [
      ['mode', 'DESC'],
      ['is_locked', 'DESC'],
      ['updated_at', 'DESC'],
    ],
  });

  const profile =
    profiles.find((p) => p.mode === SCORE_MODE.FINAL && p.is_locked) ||
    profiles.find((p) => p.mode === SCORE_MODE.FINAL) ||
    profiles.find((p) => p.main_score != null);

  if (!profile || profile.main_score == null) {
    throw createHttpError(400, 'TOUR-002', 'Недостаточно данных для участия — укажите баллы');
  }

  const snapshot = {
    main_score: profile.main_score,
    subject_scores: profile.subject_scores_json,
  };

  const holdMinutes = Number(settings.hold_minutes || 0);
  if (holdMinutes > 0) {
    snapshot.hold_expires_at = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();
  }

  return snapshot;
}

export async function joinTour(userId, tourId, slotType) {
  if (!slotType || !Object.values(TOUR_SLOT_TYPE).includes(slotType)) {
    throw createHttpError(400, 'VALIDATION_ERROR', 'Укажите slot_type: budget или contract');
  }

  const access = await getUserFeatureAccess(userId);
  if (!access.can_use_tours) {
    throw createHttpError(
      402,
      'ANL-002',
      access.blocked_reason === 'scores'
        ? 'Укажите баллы в личном кабинете'
        : 'Функция доступна по подписке Premium'
    );
  }

  const subscribed = await userHasActiveSubscription(userId);

  const tour = await Tour.findByPk(tourId);
  if (!tour || tour.status !== TOUR_STATUS.OPEN) {
    throw createHttpError(400, 'TOUR-001', 'Участие в туре завершено');
  }

  const settings = getTourSettings(tour);

  const existing = await TourParticipation.findOne({
    where: { tour_id: tourId, user_id: userId, status: PARTICIPATION_STATUS.JOINED },
  });
  if (existing) {
    throw createHttpError(400, 'TOUR-003', 'Вы уже участвуете в туре');
  }

  await assertCertificateEligible(userId, settings);
  await assertSlotAvailable(tourId, slotType, settings);

  const scoreSnapshot = await getEligibleScoreSnapshot(userId, settings);
  const profile = await Profile.findOne({ where: { user_id: userId } });

  const participation = await sequelize.transaction(async (transaction) => {
    await assertSlotAvailable(tourId, slotType, settings);

    const created = await TourParticipation.create(
      {
        tour_id: tourId,
        user_id: userId,
        slot_type: slotType,
        score_snapshot: scoreSnapshot,
        status: PARTICIPATION_STATUS.JOINED,
      },
      { transaction }
    );

    await recomputeTourRanking(tourId, transaction);
    return created;
  });

  if (!subscribed) {
    await consumeUnlock(userId, REDEMPTION_FEATURE.TOUR_UNLOCK);
  }

  return {
    participation,
    public_label: getPublicLabel(profile),
    hold_expires_at: scoreSnapshot.hold_expires_at || null,
  };
}

export async function withdrawFromTour(userId, tourId) {
  const participation = await TourParticipation.findOne({
    where: { tour_id: tourId, user_id: userId, status: PARTICIPATION_STATUS.JOINED },
  });

  if (!participation) {
    throw createHttpError(404, 'NOT_FOUND', 'Участие не найдено');
  }

  const holdExpires = participation.score_snapshot?.hold_expires_at;
  if (holdExpires && new Date(holdExpires) > new Date()) {
    throw createHttpError(400, 'TOUR-006', 'Нельзя выйти из тура во время удержания места');
  }

  await sequelize.transaction(async (transaction) => {
    await participation.update(
      { status: PARTICIPATION_STATUS.WITHDRAWN, withdrawn_at: new Date() },
      { transaction }
    );
    await RankingEntry.destroy({ where: { tour_id: tourId, user_id: userId }, transaction });
    await recomputeTourRanking(tourId, transaction);
  });

  return participation;
}

export async function recomputeTourRanking(tourId, transaction) {
  const participations = await TourParticipation.findAll({
    where: { tour_id: tourId, status: PARTICIPATION_STATUS.JOINED },
    include: [{ model: User, as: 'user', include: [{ model: Profile, as: 'profile' }] }],
    transaction,
  });

  await RankingEntry.destroy({ where: { tour_id: tourId }, transaction });

  const sorted = participations
    .map((p) => ({
      user_id: p.user_id,
      main_score: Number(p.score_snapshot?.main_score || 0),
      public_label: getPublicLabel(p.user?.profile),
      score_snapshot: p.score_snapshot,
      slot_type: p.slot_type,
    }))
    .sort((a, b) => b.main_score - a.main_score);

  for (let i = 0; i < sorted.length; i += 1) {
    await RankingEntry.create(
      {
        tour_id: tourId,
        user_id: sorted[i].user_id,
        rank: i + 1,
        public_label: sorted[i].public_label,
        score_snapshot: { ...sorted[i].score_snapshot, slot_type: sorted[i].slot_type },
      },
      { transaction }
    );
  }
}
