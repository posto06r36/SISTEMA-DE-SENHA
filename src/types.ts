import { Timestamp } from 'firebase/firestore';

export type TicketStatus = 'waiting' | 'calling' | 'finished' | 'canceled';
export type TicketType = 
  | 'CU - Normal' 
  | 'CU - Prioritário' 
  | 'ID - Normal' 
  | 'ID - Prioritário';

export interface Ticket {
  id?: string;
  number: number;
  type: TicketType;
  status: TicketStatus;
  counter?: string;
  citizenName?: string;
  createdAt: any; // ISO string from API
  calledAt?: any;
  finishedAt?: any;
}

export interface Settings {
  lastNumber: number;
}
