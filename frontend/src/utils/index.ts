import { formatEther as viemFormatEther, parseEther as viemParseEther, isAddress } from 'viem'

// Utility functions for the Web3 Ticketing Interface

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatEther = (value: bigint): string => {
  return viemFormatEther(value);
};

export const parseEther = (value: string): bigint => {
  return viemParseEther(value);
};

export const isValidAddress = (address: string): boolean => {
  return isAddress(address);
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString();
};

export const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

export const formatPrice = (price: bigint, decimals: number = 4): string => {
  const formatted = formatEther(price);
  const num = parseFloat(formatted);
  return num.toFixed(decimals).replace(/\.?0+$/, '');
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

// Export contract error utilities
export * from './contractErrors';
