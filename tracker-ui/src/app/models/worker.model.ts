export interface Worker {
  id: string;
  name: string;
  email: string;
  isAvailable: boolean;
  isOnShift: boolean;
  magicLinkToken?: string;
  magicLinkTokenExpiresAt?: string | Date;
}
