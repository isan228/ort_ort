import bcrypt from 'bcrypt';
import { connectDatabase, sequelize } from '../config/database.js';
import { User, Profile, Role, Wallet } from '../models/index.js';
import { ROLES, USER_STATUS, USER_PHASE, PUBLIC_DISPLAY_MODE } from '../constants/index.js';
import { seedDefaults } from './seedDefaults.js';

const SALT_ROUNDS = 12;

const email = (process.env.TEST_ADMIN_EMAIL || 'admin@ort.kg').toLowerCase();
const password = process.env.TEST_ADMIN_PASSWORD || 'Admin12345!';
const fullName = process.env.TEST_ADMIN_NAME || 'Test Admin';

async function ensureProfileAndWallet(userId, transaction) {
  const profile = await Profile.findOne({ where: { user_id: userId }, transaction });
  if (!profile) {
    await Profile.create(
      {
        user_id: userId,
        full_name: fullName,
        nickname: 'admin',
        public_display_mode: PUBLIC_DISPLAY_MODE.CERTIFICATE_NUMBER,
      },
      { transaction }
    );
  }

  const wallet = await Wallet.findOne({ where: { user_id: userId }, transaction });
  if (!wallet) {
    await Wallet.create({ user_id: userId }, { transaction });
  }
}

async function main() {
  await connectDatabase();
  await seedDefaults();

  const adminRole = await Role.findOne({ where: { code: ROLES.ADMIN } });
  if (!adminRole) {
    throw new Error('Роль admin не найдена. Запустите npm run db:sync -w backend');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await sequelize.transaction(async (transaction) => {
    let existing = await User.findOne({ where: { email }, transaction });

    if (existing) {
      await existing.update(
        {
          role_id: adminRole.id,
          password_hash: passwordHash,
          status: USER_STATUS.ACTIVE,
        },
        { transaction }
      );
      await ensureProfileAndWallet(existing.id, transaction);
      return existing;
    }

    const created = await User.create(
      {
        email,
        password_hash: passwordHash,
        role_id: adminRole.id,
        phase: USER_PHASE.AFTER_RESULTS,
        status: USER_STATUS.ACTIVE,
      },
      { transaction }
    );

    await ensureProfileAndWallet(created.id, transaction);
    return created;
  });

  console.log('');
  console.log('Тестовый админ готов');
  console.log('────────────────────');
  console.log(`Email:    ${email}`);
  console.log(`Пароль:   ${password}`);
  console.log(`ID:       ${user.id}`);
  console.log('');
  console.log('Вход:     /login');
  console.log('Админка:  /admin');
  console.log('');
  console.log('Переопределить через .env: TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_ADMIN_NAME');
  console.log('');

  process.exit(0);
}

main().catch((err) => {
  console.error('Не удалось создать тестового админа:', err.message);
  process.exit(1);
});
