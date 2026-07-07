export interface Worker {
  id: string;
  name: string;
  email: string;
  role?: string;
  isAvailable: boolean;
  isOnShift: boolean;
  magicLinkToken?: string;
  magicLinkTokenExpiresAt?: string | Date;
}
