export interface Board {
  id: string;
  name: string;
  location: string;
  qrConfig?: string; // Stored as a JSON string
}

export interface QrConfig {
  size: number;
  showLabel: boolean;
}
