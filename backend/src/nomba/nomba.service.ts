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
      baseURL: this.config.get('NOMBA_BASE_URL', 'https://sandbox.nomba.com/v1'),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Auth ────────────────────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const accountId = this.config.get('NOMBA_ACCOUNT_ID');
    const clientId = this.config.get('NOMBA_CLIENT_ID');
    const clientSecret = this.config.get('NOMBA_CLIENT_SECRET');

    this.logger.debug(
      `[NombaAuth] Requesting token for accountId=${accountId} clientId=${clientId}`,
    );

    try {
      const response = await this.client.post(
        '/auth/token/issue',
        {
          grant_type: 'client_credentials',
          clientId,
          clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accountId,
          },
        },
      );

      const token: string | undefined =
        response.data?.data?.access_token ?? response.data?.access_token;
      const expiresIn: number =
        response.data?.data?.expires_in ?? response.data?.expires_in ?? 3600;

      if (!token) {
        this.logger.error(
          'Nomba auth response missing access_token',
          JSON.stringify(response.data),
        );
        throw new HttpException(
          'Nomba authentication failed: no token returned',
          HttpStatus.UNAUTHORIZED,
        );
      }

      this.accessToken = token;
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000);
      this.logger.debug(`[NombaAuth] Token acquired, expires in ${expiresIn}s`);
      return token;
    } catch (err) {
      // Reset cached token so next request retries auth from scratch
      this.accessToken = null;
      this.tokenExpiry = null;

      const status = err?.response?.status;
      const body = err?.response?.data;
      this.logger.error(
        `Nomba auth failed — HTTP ${status ?? 'N/A'}: ${JSON.stringify(body ?? err?.message)}`,
      );
      throw new HttpException(
        `Nomba authentication failed (${status ?? 'no response'})`,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private async authHeaders(accountIdOverride?: string) {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // Nomba requires the accountId header to match the account in the URL path.
      // Pass an override when querying a sub-account endpoint.
      accountId: accountIdOverride || this.config.get('NOMBA_ACCOUNT_ID'),
    };
  }

  // ─── Account ─────────────────────────────────────────────────────────────────

  async getAccountBalance(accountId?: string): Promise<any> {
    const id = accountId || this.config.get('NOMBA_ACCOUNT_ID');
    const headers = await this.authHeaders(id);
    const response = await this.client.get('/accounts/balance', { headers });
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
    const parentAccountId = this.config.get('NOMBA_ACCOUNT_ID');
    const subAccountId =
      params.accountId ||
      this.config.get('NOMBA_SUB_ACCOUNT_ID');

    // Always authenticate with parent accountId in header
    const headers = await this.authHeaders(parentAccountId);

    const queryParams: Record<string, any> = {
      limit: params.limit || 50,
    };
    if (params.startDate) queryParams.dateFrom = params.startDate;
    if (params.endDate) queryParams.dateTo = params.endDate;
    if (params.page) queryParams.page = params.page;

    // If sub-account is set, query the sub-account transactions endpoint.
    // Otherwise, query the parent account transactions endpoint.
    const urlPath = subAccountId && subAccountId !== parentAccountId
      ? `/transactions/sub-account/${subAccountId}`
      : '/transactions/accounts';

    const response = await this.client.get(urlPath, {
      headers,
      params: queryParams,
    });
    return response.data;
  }

  async getTransactionByReference(reference: string): Promise<any> {
    const parentAccountId = this.config.get('NOMBA_ACCOUNT_ID');
    const subAccountId = this.config.get('NOMBA_SUB_ACCOUNT_ID');

    // Always authenticate with parent accountId in header
    const headers = await this.authHeaders(parentAccountId);

    // If sub-account is set, query the sub-account single transaction endpoint.
    // Otherwise, query the parent account single transaction endpoint.
    const urlPath = subAccountId && subAccountId !== parentAccountId
      ? `/transactions/accounts/${subAccountId}/single`
      : '/transactions/accounts/single';

    const response = await this.client.get(urlPath, {
      headers,
      params: { transactionRef: reference },
    });
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
    const parentAccountId = this.config.get('NOMBA_ACCOUNT_ID');
    const subAccountId = this.config.get('NOMBA_SUB_ACCOUNT_ID');
    const headers = await this.authHeaders(parentAccountId);

    // Nomba POST /v2/transfers/bank requires an accountName.
    // Resolve the account name dynamically before sending the transfer.
    let accountName = 'NombaOS Transfer Beneficiary';
    try {
      const lookupResult = await this.verifyBankAccount(
        payload.beneficiaryAccountNumber,
        payload.beneficiaryBankCode,
      );
      if (lookupResult?.data?.accountName) {
        accountName = lookupResult.data.accountName;
      }
    } catch (err) {
      this.logger.warn(`Could not resolve bank account name: ${err.message}`);
    }

    // Determine if we transfer from parent or sub-account pocket
    const baseUrl = this.config.get(
      'NOMBA_BASE_URL',
      'https://sandbox.nomba.com/v1',
    );
    const v2BaseUrl = baseUrl.replace('/v1', '/v2');
    const transferUrl = subAccountId
      ? `${v2BaseUrl}/transfers/bank/${subAccountId}`
      : `${v2BaseUrl}/transfers/bank`;

    const response = await this.client.post(
      transferUrl,
      {
        amount: payload.amount,
        accountNumber: payload.beneficiaryAccountNumber,
        accountName,
        bankCode: payload.beneficiaryBankCode,
        merchantTxRef: payload.reference,
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
    const response = await this.client.post(
      '/transfers/bank/lookup',
      { accountNumber, bankCode },
      { headers },
    );
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
    const response = await this.client.post(
      '/checkout/order',
      {
        amount: payload.amount,
        currency: 'NGN',
        orderDescription: payload.description,
        callbackUrl:
          payload.redirectUrl ||
          `${this.config.get('FRONTEND_URL')}/payment/callback`,
        merchantTxRef: payload.reference,
        customerEmail: payload.customerEmail,
        customerName: payload.customerName,
      },
      { headers },
    );
    return response.data;
  }

  async getPaymentLinkStatus(reference: string): Promise<any> {
    const headers = await this.authHeaders();
    const response = await this.client.get('/checkout/transaction', {
      headers,
      params: { idType: 'ORDER_REFERENCE', id: reference },
    });
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
    const accountId = this.config.get('NOMBA_ACCOUNT_ID');
    const headers = await this.authHeaders(accountId);
    const queryParams: Record<string, any> = {};
    if (params?.startDate) queryParams.dateFrom = params.startDate;
    if (params?.endDate) queryParams.dateTo = params.endDate;

    const response = await this.client.get(
      `/accounts/${accountId}/settlements`,
      { headers, params: queryParams },
    );
    return response.data;
  }
}
