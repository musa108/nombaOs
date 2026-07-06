import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class NombaService {
  private readonly logger = new Logger(NombaService.name);
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private config: ConfigService) {
    this.client = axios.create({
      baseURL: this.config.get('NOMBA_BASE_URL', 'https://api.nomba.com/v1'),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await this.client.post('/auth/token/issue', {
        grant_type: 'client_credentials',
        client_id: this.config.get('NOMBA_CLIENT_ID'),
        client_secret: this.config.get('NOMBA_CLIENT_SECRET'),
        // Nomba requires the parent account ID in every auth request
        accountId: this.config.get('NOMBA_ACCOUNT_ID'),
      });

      const token: string | undefined = response.data?.data?.access_token ?? response.data?.access_token;
      const expiresIn: number = response.data?.data?.expires_in ?? response.data?.expires_in ?? 3600;

      if (!token) {
        this.logger.error(
          'Nomba auth response missing access_token',
          response.data,
        );
        throw new HttpException(
          'Nomba authentication failed: no token returned',
          HttpStatus.UNAUTHORIZED,
        );
      }

      this.accessToken = token;
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000);
      return token;
    } catch (err) {
      this.logger.error('Nomba auth failed', err?.response?.data);
      throw new HttpException(
        'Nomba authentication failed',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private async authHeaders() {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Scope all calls to the parent account; sub-account is used in path params
      accountId: this.config.get('NOMBA_ACCOUNT_ID'),
    };
  }

  // ─── Account ─────────────────────────────────────────────────────────────────

  async getAccountBalance(accountId?: string): Promise<any> {
    const id = accountId || this.config.get('NOMBA_ACCOUNT_ID');
    const headers = await this.authHeaders();
    const response = await this.client.get(`/accounts/${id}`, { headers });
    return response.data;
  }

  async listAccounts(): Promise<any> {
    const headers = await this.authHeaders();
    const response = await this.client.get('/accounts', { headers });
    return response.data;
  }

  // ─── Transactions ────────────────────────────────────────────────────────────

  async getTransactions(params: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const accountId = params.accountId || this.config.get('NOMBA_ACCOUNT_ID');
    const headers = await this.authHeaders();
    const response = await this.client.get(
      `/accounts/${accountId}/transactions`,
      {
        headers,
        params: {
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page || 1,
          limit: params.limit || 50,
        },
      },
    );
    return response.data;
  }

  async getTransactionByReference(reference: string): Promise<any> {
    const headers = await this.authHeaders();
    const accountId = this.config.get('NOMBA_ACCOUNT_ID');
    const response = await this.client.get(
      `/accounts/${accountId}/transactions/${reference}`,
      { headers },
    );
    return response.data;
  }

  // ─── Transfers ────────────────────────────────────────────────────────────────

  async initiateTransfer(payload: {
    amount: number;
    beneficiaryAccountNumber: string;
    beneficiaryBankCode: string;
    narration?: string;
    reference: string;
  }): Promise<any> {
    const headers = await this.authHeaders();
    const accountId = this.config.get('NOMBA_ACCOUNT_ID');
    const response = await this.client.post(
      `/accounts/${accountId}/transfer`,
      {
        amount: payload.amount,
        beneficiaryAccountNumber: payload.beneficiaryAccountNumber,
        beneficiaryBankCode: payload.beneficiaryBankCode,
        narration: payload.narration || 'NombaOS Transfer',
        reference: payload.reference,
        currency: 'NGN',
      },
      { headers },
    );
    return response.data;
  }

  async verifyBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<any> {
    const headers = await this.authHeaders();
    const response = await this.client.get('/accounts/resolve', {
      headers,
      params: { accountNumber, bankCode },
    });
    return response.data;
  }

  // ─── Payment Links ─────────────────────────────────────────────────────────────

  async createPaymentLink(payload: {
    amount: number;
    description: string;
    reference: string;
    redirectUrl?: string;
    customerEmail?: string;
    customerName?: string;
  }): Promise<any> {
    const headers = await this.authHeaders();
    const accountId = this.config.get('NOMBA_ACCOUNT_ID');
    const response = await this.client.post(
      `/accounts/${accountId}/checkout/order`,
      {
        amount: payload.amount,
        currency: 'NGN',
        orderDescription: payload.description,
        callbackUrl:
          payload.redirectUrl ||
          `${this.config.get('FRONTEND_URL')}/payment/callback`,
        merchantTxRef: payload.reference,
        customerId: payload.customerEmail,
        customerName: payload.customerName,
      },
      { headers },
    );
    return response.data;
  }

  async getPaymentLinkStatus(reference: string): Promise<any> {
    const headers = await this.authHeaders();
    const accountId = this.config.get('NOMBA_ACCOUNT_ID');
    const response = await this.client.get(
      `/accounts/${accountId}/checkout/order/${reference}`,
      { headers },
    );
    return response.data;
  }

  // ─── Banks ─────────────────────────────────────────────────────────────────────

  async listBanks(): Promise<any> {
    const headers = await this.authHeaders();
    const response = await this.client.get('/transfers/banks', { headers });
    return response.data;
  }

  // ─── Settlements ───────────────────────────────────────────────────────────────

  async getSettlements(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const headers = await this.authHeaders();
    const accountId = this.config.get('NOMBA_ACCOUNT_ID');
    const response = await this.client.get(
      `/accounts/${accountId}/settlements`,
      { headers, params },
    );
    return response.data;
  }
}
