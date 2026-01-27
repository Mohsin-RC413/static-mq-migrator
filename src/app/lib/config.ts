export const API_BASE_URL = 'http://localhost:8080';
export const WS_BASE_URL = 'ws://localhost:8080';

export const apiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

export const wsUrl = (path: string) =>
  `${WS_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
