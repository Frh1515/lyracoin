// API utility functions for backend communication
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Generic API call function
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${BACKEND_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Health check
export async function checkBackendHealth(): Promise<ApiResponse> {
  return apiCall('/api/health');
}

// Verify payment
export async function verifyPayment(paymentData: {
  wallet_address: string;
  lyra_amount: number;
  transaction_hash: string;
  telegram_id: string;
}): Promise<ApiResponse> {
  return apiCall('/api/verify-payment', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
}

// Get boost status
export async function getBoostStatus(): Promise<ApiResponse> {
  return apiCall('/api/boost-status');
}

// Update boost status
export async function updateBoostStatus(boostData: {
  multiplier: number;
  duration: number;
  transaction_hash: string;
}): Promise<ApiResponse> {
  return apiCall('/api/boost-status', {
    method: 'POST',
    body: JSON.stringify(boostData),
  });
}