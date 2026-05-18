import api from './client';

export interface PromoValidateResult {
  valid: boolean;
  promoCodeId?: string;
  code?: string;
  discountAmount?: number;
  influencerName?: string;
  message: string;
}

export const promoApi = {
  validate: (code: string, tierId: string) =>
    api.post<PromoValidateResult>('/api/promo/validate', { code, tierId }),
};
