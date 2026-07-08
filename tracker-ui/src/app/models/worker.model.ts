export interface Worker {
  id: string;
  name: string;
  email: string;
  role?: string;
  isAvailable: boolean;
  isOnShift: boolean;
  photoUrl?: string;
  magicLinkToken?: string;
  magicLinkTokenExpiresAt?: string | Date;
}
