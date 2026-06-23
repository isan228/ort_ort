import { User, University, Specialty } from '../models/index.js';
import { CATALOG_STATUS, USER_STATUS } from '../constants/index.js';

export async function getPublicPlatformStats() {
  const [usersCount, universitiesCount, programsCount] = await Promise.all([
    User.count({ where: { status: USER_STATUS.ACTIVE } }),
    University.count({ where: { status: CATALOG_STATUS.ACTIVE } }),
    Specialty.count({ where: { status: CATALOG_STATUS.ACTIVE } }),
  ]);

  return {
    users_count: usersCount,
    universities_count: universitiesCount,
    programs_count: programsCount,
  };
}
