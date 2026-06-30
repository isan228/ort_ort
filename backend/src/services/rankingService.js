import { RankingEntry, ScoreProfile, User, Profile } from '../models/index.js';
import { Op } from 'sequelize';
import { SCORE_MODE, PUBLIC_DISPLAY_MODE } from '../constants/index.js';

function getPublicLabel(profile) {
  if (!profile) return 'anonymous';
  if (profile.public_display_mode === PUBLIC_DISPLAY_MODE.CERTIFICATE_NUMBER && profile.certificate_number) {
    return profile.certificate_number;
  }
  return profile.nickname || 'user';
}

export async function getKyrgyzstanRanking({ limit = 50, offset = 0, userId = null } = {}) {
  const { rows, count } = await RankingEntry.findAndCountAll({
    where: { tour_id: null },
    order: [['rank', 'ASC']],
    limit,
    offset,
  });

  let ownRow = null;
  if (userId) {
    ownRow = await RankingEntry.findOne({ where: { tour_id: null, user_id: userId } });
  }

  return {
    rankings: rows,
    total: count,
    own_row: ownRow,
    top_10: rows.slice(0, 10),
    top_30: rows.slice(0, 30),
  };
}

export async function rebuildGlobalRanking() {
  const finals = await ScoreProfile.findAll({
    where: {
      mode: SCORE_MODE.FINAL,
      main_score: { [Op.ne]: null },
    },
    include: [{ model: User, as: 'user', include: [{ model: Profile, as: 'profile' }] }],
  });

  const candidates = finals
    .filter((f) => f.main_score != null)
    .map((f) => ({
      user_id: f.user_id,
      main_score: Number(f.main_score),
      public_label: getPublicLabel(f.user?.profile),
      score_snapshot: { main_score: f.main_score },
    }))
    .sort((a, b) => b.main_score - a.main_score);

  await RankingEntry.destroy({ where: { tour_id: null } });

  for (let i = 0; i < candidates.length; i += 1) {
    await RankingEntry.create({
      tour_id: null,
      user_id: candidates[i].user_id,
      rank: i + 1,
      public_label: candidates[i].public_label,
      score_snapshot: candidates[i].score_snapshot,
    });
  }

  return candidates.length;
}
