import { v4 as uuidv4 } from 'uuid';
import { PAYMENT_STATUS } from '../constants/index.js';
import { config } from '../config/index.js';
import { finikProvider } from './finikProvider.js';

/**
 * Заглушка платёжного провайдера (dev / тесты).
 */
export class StubPaymentProvider {
  static providerName = 'stub';

  async createPayment({ amountKgs, userId, planId, paymentId, metadata = {} }) {
    const providerPaymentId = paymentId || `stub_${uuidv4()}`;

    return {
      provider: StubPaymentProvider.providerName,
      providerPaymentId,
      status: PAYMENT_STATUS.PENDING,
      amountKgs,
      paymentUrl: null,
      redirectUrl: null,
      requiresRedirect: false,
      metadata: {
        ...metadata,
        userId,
        planId,
        message: 'Stub provider: вызовите POST /api/v1/payments/:id/confirm для имитации успешной оплаты',
      },
    };
  }

  async confirmPayment(providerPaymentId) {
    return {
      provider: StubPaymentProvider.providerName,
      providerPaymentId,
      status: PAYMENT_STATUS.COMPLETED,
      completedAt: new Date(),
    };
  }
}

function createPaymentProvider() {
  if (config.payment.provider === 'finik') {
    return finikProvider;
  }
  return new StubPaymentProvider();
}

export const paymentProvider = createPaymentProvider();
