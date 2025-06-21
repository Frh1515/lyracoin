// API utility functions for backend communication
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Generic API call function with better error handling
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    if (!BACKEND_URL) {
      throw new Error('Backend URL not configured');
    }

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
      // Add timeout for better UX
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        errorMessage = 'Request timeout - please check your connection';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error - backend may be unavailable';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Health check with detailed response
export async function checkBackendHealth(): Promise<ApiResponse<{
  status: string;
  timestamp: string;
  uptime: number;
}>> {
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
export async function getBoostStatus(wallet?: string): Promise<ApiResponse> {
  const endpoint = wallet ? `/api/boost-status/${wallet}` : '/api/boost-status';
  return apiCall(endpoint);
}

// Update boost status
export async function updateBoostStatus(boostData: {
  multiplier: number;
  duration: number;
  transaction_hash: string;
  wallet_address?: string;
}): Promise<ApiResponse> {
  return apiCall('/api/boost-status', {
    method: 'POST',
    body: JSON.stringify(boostData),
  });
}

// Ping endpoint for connectivity test
export async function pingBackend(): Promise<ApiResponse> {
  return apiCall('/api/ping');
}