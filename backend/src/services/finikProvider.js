import { createRequire } from 'node:module';
import fs from 'node:fs';
import { config } from '../config/index.js';
import { PAYMENT_STATUS } from '../constants/index.js';

const require = createRequire(import.meta.url);
const { Signer } = require('@mancho.devs/authorizer');

function readPem(envValue, filePath) {
  if (envValue?.includes('BEGIN')) {
    return envValue.replace(/\\n/g, '\n');
  }
  if (filePath && fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  return null;
}

export class FinikPaymentProvider {
  static providerName = 'finik';

  getBaseUrl() {
    return config.finik.baseUrl;
  }

  getHost() {
    return new URL(this.getBaseUrl()).host;
  }

  getPrivateKey() {
    const key = readPem(config.finik.privateKeyPem, config.finik.privateKeyPath);
    if (!key) {
      throw new Error('FINIK private key not configured (FINIK_PRIVATE_PEM or FINIK_PRIVATE_KEY_PATH)');
    }
    return key;
  }

  getPublicKey() {
    const key = readPem(config.finik.publicKeyPem, config.finik.publicKeyPath);
    if (!key) {
      throw new Error('FINIK public key not configured (FINIK_PUBLIC_PEM or FINIK_PUBLIC_KEY_PATH)');
    }
    return key;
  }

  assertConfigured() {
    if (!config.finik.apiKey) throw new Error('FINIK_API_KEY is not configured');
    if (!config.finik.accountId) throw new Error('FINIK_ACCOUNT_ID is not configured');
    this.getPrivateKey();
  }

  async signRequest({ method, path, headers, body }) {
    const signature = await new Signer({
      httpMethod: method,
      path,
      headers,
      queryStringParameters: undefined,
      body,
    }).sign(this.getPrivateKey());

    return signature;
  }

  async createPayment({ amountKgs, paymentId, metadata = {} }) {
    const amount = Math.round(Number(amountKgs));

    if (amount <= 0) {
      return {
        provider: FinikPaymentProvider.providerName,
        providerPaymentId: paymentId,
        status: PAYMENT_STATUS.PENDING,
        amountKgs: 0,
        paymentUrl: null,
        redirectUrl: null,
        requiresRedirect: false,
        metadata: { ...metadata, free_checkout: true },
      };
    }

    this.assertConfigured();

    const timestamp = Date.now().toString();
    const host = this.getHost();
    const path = '/v1/payment';
    const redirectUrl = `${config.clientUrl}/subscription?payment=return`;
    const webhookUrl = `${config.clientUrl}${config.finik.webhookPath}`;

    const body = {
      Amount: amount,
      CardType: 'FINIK_QR',
      PaymentId: paymentId,
      RedirectUrl: redirectUrl,
      Data: {
        accountId: config.finik.accountId,
        name_en: config.finik.qrNameEn,
        webhookUrl,
        description: metadata.planTitle || 'ORT.KG Premium',
      },
    };

    const headers = {
      Host: host,
      'x-api-key': config.finik.apiKey,
      'x-api-timestamp': timestamp,
    };

    const signature = await this.signRequest({
      method: 'POST',
      path,
      headers,
      body,
    });

    const url = `${this.getBaseUrl()}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.finik.apiKey,
        'x-api-timestamp': timestamp,
        signature,
      },
      body: JSON.stringify(body),
      redirect: 'manual',
    });

    if (response.status === 302 || response.status === 301) {
      const paymentUrl = response.headers.get('location');
      if (!paymentUrl) {
        throw new Error('Finik не вернул ссылку на оплату (Location)');
      }

      return {
        provider: FinikPaymentProvider.providerName,
        providerPaymentId: paymentId,
        status: PAYMENT_STATUS.PENDING,
        amountKgs: amount,
        paymentUrl,
        redirectUrl,
        requiresRedirect: true,
        metadata: { ...metadata, finik_payment_id: paymentId },
      };
    }

    if (response.status === 201) {
      const json = await response.json().catch(() => ({}));
      const paymentUrl = json.paymentUrl || json.payment_url;
      if (!paymentUrl) {
        throw new Error('Finik вернул 201 без paymentUrl');
      }

      return {
        provider: FinikPaymentProvider.providerName,
        providerPaymentId: json.paymentId || paymentId,
        status: PAYMENT_STATUS.PENDING,
        amountKgs: amount,
        paymentUrl,
        redirectUrl,
        requiresRedirect: true,
        metadata: { ...metadata, finik_response: json },
      };
    }

    const errorText = await response.text().catch(() => '');
    let message = `Finik API error (${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.ErrorMessage || parsed.message || message;
    } catch {
      if (errorText) message = errorText.slice(0, 300);
    }
    const error = new Error(message);
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }

  async verifyWebhook({ method, path, headers, body, signature }) {
    if (!signature) return false;

    const timestamp = headers['x-api-timestamp'];
    if (timestamp) {
      const ts = Number(timestamp);
      const skew = config.finik.timestampSkewMs;
      if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > skew) {
        return false;
      }
    }

    const signerHeaders = {
      Host: headers.host,
      'x-api-key': headers['x-api-key'],
      'x-api-timestamp': headers['x-api-timestamp'],
    };

    return new Signer({
      httpMethod: method,
      path,
      headers: signerHeaders,
      queryStringParameters: undefined,
      body,
    }).verify(this.getPublicKey(), signature);
  }
}

export const finikProvider = new FinikPaymentProvider();
