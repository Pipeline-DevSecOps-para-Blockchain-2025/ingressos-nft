// Type definitions for the Web3 Ticketing Interface
export interface Event {
  eventId: number;
  name: string;
  description: string;
  eventDate: number;
  venue: string;
  ticketPrice: bigint;
  maxSupply: number;
  currentSupply: number;
  organizer: string;
  status: EventStatus;
}

export interface Ticket {
  tokenId: number;
  eventId: number;
  ticketNumber: number;
  purchaseDate: number;
  originalBuyer: string;
  currentOwner: string;
  metadata: TicketMetadata;
}

export interface TicketMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface UserState {
  address: string | null;
  isConnected: boolean;
  isOrganizer: boolean;
  isAdmin: boolean;
  balance: bigint;
  tickets: Ticket[];
}

export const EventStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
  SOLD_OUT: 'SOLD_OUT'
} as const;

export type EventStatus = typeof EventStatus[keyof typeof EventStatus];

export const ErrorType = {
  WALLET_CONNECTION: 'WALLET_CONNECTION',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];
