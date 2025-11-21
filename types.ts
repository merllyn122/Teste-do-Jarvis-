export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface VisualizerData {
  volume: number; // 0 to 1
  isActive: boolean;
}

export interface LogMessage {
  id: string;
  timestamp: Date;
  sender: 'USER' | 'SYSTEM' | 'JARVIS';
  text: string;
}
