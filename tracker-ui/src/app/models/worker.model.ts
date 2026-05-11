export interface Worker {
  id: string;
  name: string;
  email: string;
  isAvailable: boolean;
  magicLinkToken?: string;
  magicLinkTokenExpiresAt?: string | Date;
}
