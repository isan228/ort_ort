import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { config } from './config/index.js';
import { connectDatabase, syncDatabase } from './config/database.js';
import { seedDefaults } from './scripts/seedDefaults.js';
import publicRoutes from './routes/publicRoutes.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import tourRoutes from './routes/tourRoutes.js';
import rankingRoutes from './routes/rankingRoutes.js';
import monetizationRoutes from './routes/monetizationRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import tutorRoutes from './routes/tutorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import legalRoutes from './routes/legalRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
app.use(express.json());

app.use('/api', publicRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', accountRoutes);
app.use('/api/v1', analysisRoutes);
app.use('/api/v1', catalogRoutes);
app.use('/api/v1', tourRoutes);
app.use('/api/v1', rankingRoutes);
app.use('/api/v1', monetizationRoutes);
app.use('/api/v1', contentRoutes);
app.use('/api/v1', notificationRoutes);
app.use('/api/v1', supportRoutes);
app.use('/api/v1', collectionRoutes);
app.use('/api/v1', tutorRoutes);
app.use('/api/v1', legalRoutes);
app.use('/api/v1', faqRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function bootstrap() {
  const certDir = path.join(process.cwd(), 'uploads', 'certificates');
  fs.mkdirSync(certDir, { recursive: true });

  await connectDatabase();
  await syncDatabase();
  await seedDefaults();

  console.log(`Public URL: ${config.clientUrl} (Finik redirect / CORS)`);
  if (config.payment.provider === 'finik') {
    console.log(`Finik webhook: ${config.clientUrl}${config.finik.webhookPath}`);
  }

  app.listen(config.port, () => {
    console.log(`API running on http://localhost:${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
