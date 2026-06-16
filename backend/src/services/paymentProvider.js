import { v4 as uuidv4 } from 'uuid';
import { PAYMENT_STATUS } from '../constants/index.js';

/**
 * Заглушка платёжного провайдера.
 * Позже заменяется на реальный адаптер без смены бизнес-логики.
 */
export class StubPaymentProvider {
  static providerName = 'stub';

  async createPayment({ amountKgs, userId, planId, metadata = {} }) {
    const providerPaymentId = `stub_${uuidv4()}`;

    return {
      provider: StubPaymentProvider.providerName,
      providerPaymentId,
      status: PAYMENT_STATUS.PENDING,
      amountKgs,
      redirectUrl: null,
      metadata: {
        ...metadata,
        userId,
        planId,
        message: 'Stub provider: вызовите POST /api/payments/:id/confirm для имитации успешной оплаты',
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

  async getPaymentStatus(providerPaymentId) {
    return {
      provider: StubPaymentProvider.providerName,
      providerPaymentId,
      status: PAYMENT_STATUS.PENDING,
    };
  }
}

export const paymentProvider = new StubPaymentProvider();
