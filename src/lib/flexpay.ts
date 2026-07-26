// FlexPay API Client Integration
// This handles Mobile Money and Card payments for subscribers in Hico-Cleaning.

export interface FlexPayInitResponse {
  success: boolean;
  orderNumber?: string;
  message?: string;
  error?: string;
  isSimulated?: boolean;
}

export interface FlexPayCheckResponse {
  success: boolean;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  message?: string;
  orderNumber?: string;
  isSimulated?: boolean;
}

// Utility to clean and format DRC phone numbers to international format (243...)
export function formatDRCPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (cleaned.startsWith('+243')) {
    return cleaned.replace('+', '');
  }
  if (cleaned.startsWith('243')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '243' + cleaned.substring(1);
  }
  return '243' + cleaned;
}

// Automatically detect mobile operator from DRC phone number prefix
// M-Pesa: 81, 82, 83
// Orange Money: 80, 84, 85, 89
// Airtel Money: 97, 98, 99
// Afrimoney: 90, 91
export function detectOperatorFromPhone(phone: string): 'mpesa' | 'orange' | 'airtel' | 'afrimoney' | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  let cleaned = digits;
  if (cleaned.startsWith('243')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length >= 2) {
    const prefix = cleaned.substring(0, 2);
    if (['81', '82', '83'].includes(prefix)) return 'mpesa';
    if (['80', '84', '85', '89'].includes(prefix)) return 'orange';
    if (['97', '98', '99'].includes(prefix)) return 'airtel';
    if (['90', '91'].includes(prefix)) return 'afrimoney';
  }
  return null;
}

// Get environment configuration with proxy endpoints for browser CORS safety
export const FLEXPAY_CONFIG = {
  token: import.meta.env.VITE_FLEXPAY_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJcL2xvZ2luIiwicm9sZXMiOlsiTUVSQ0hBTlQiXSwiZXhwIjoxODI4MzUxMjAxLCJzdWIiOiI0OTRjZTllNmUxN2JjNzBhYWI0YjY1MWUyZGZiNmE5MiJ9.1zbYW2RXru0zRlJojiFrVeZZOlbxZi5V8mzwFkUC3cE',
  merchantId: import.meta.env.VITE_FLEXPAY_MERCHANT_ID || 'AJCP',
  // Helper to get local proxy path in browser to prevent CORS issues
  getMobileUrl: () => {
    if (typeof window !== 'undefined') return '/api/flexpay-mobile';
    return import.meta.env.VITE_FLEXPAY_MOBILE_MONEY_URL || 'https://backend.flexpay.cd/api/rest/v1/paymentService';
  },
  getCardUrl: () => {
    if (typeof window !== 'undefined') return '/api/flexpay-card';
    return import.meta.env.VITE_FLEXPAY_CARD_PAYMENT_URL || 'https://cardpayment.flexpay.cd/v1.1/pay';
  },
  getCheckUrl: (orderNumber: string) => {
    if (typeof window !== 'undefined') return `/api/flexpay-check/${orderNumber}`;
    return `${import.meta.env.VITE_FLEXPAY_CHECK_URL || 'https://apicheck.flexpaie.com/api/rest/v1/check'}/${orderNumber}`;
  }
};

/**
 * Initiates a Mobile Money payment on FlexPay.
 */
export async function initiateMobileMoneyPayment(params: {
  phone: string;
  amount: number;
  currency: 'USD' | 'CDF';
  operator: 'mpesa' | 'orange' | 'airtel' | 'afrimoney';
  reference: string;
}): Promise<FlexPayInitResponse> {
  const formattedPhone = formatDRCPhoneNumber(params.phone);
  
  // Prepare payload according to FlexPay API Specification (PDF Page 4)
  const payload = {
    merchant: FLEXPAY_CONFIG.merchantId,
    type: '1', // 1 for Mobile Money
    reference: params.reference,
    amount: String(params.amount),
    currency: params.currency,
    phone: formattedPhone,
    callbackUrl: 'https://hicocleaning.netlify.app/api/callback/flexpay'
  };

  try {
    const targetUrl = FLEXPAY_CONFIG.getMobileUrl();
    console.log("Sending FlexPay Payment Request to:", targetUrl, payload);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLEXPAY_CONFIG.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`FlexPay HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    console.log("FlexPay API response received:", data);

    const isSuccess = data.code === '0' || data.code === 0 || data.success === true;

    if (!isSuccess) {
      const errMsg = data.message || 'Erreur FlexPay lors de l\'initiation';
      console.warn("FlexPay API returned error:", data);

      return {
        success: false,
        orderNumber: data.orderNumber || data.order_number,
        message: errMsg
      };
    }

    return {
      success: true,
      orderNumber: data.orderNumber || data.order_number,
      message: data.message || 'Push USSD envoyé sur votre téléphone. Saisissez votre code PIN pour valider.',
      isSimulated: false
    };

  } catch (error: any) {
    console.error("FlexPay API Request Error:", error);
    
    return {
      success: false,
      message: error.message || "Impossible de contacter le service de paiement FlexPay. Vérifiez votre connexion."
    };
  }
}

/**
 * Checks the status of a transaction on FlexPay.
 */
export async function checkFlexPayStatus(reference: string): Promise<FlexPayCheckResponse> {
  if (reference.startsWith('FP-SIM-')) {
    return {
      success: true,
      status: 'SUCCESS',
      message: 'Transaction simulée approuvée avec succès !',
      orderNumber: reference,
      isSimulated: true
    };
  }

  try {
    const checkUrl = FLEXPAY_CONFIG.getCheckUrl(reference);
    const response = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLEXPAY_CONFIG.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`FlexPay Check HTTP error: ${response.status}`);
    }

    const data = await response.json();
    console.log("FlexPay Check API response:", data);
    
    // Standard FlexPay status codes:
    // "0" -> Transaction succeeded
    // "1" -> Transaction pending or not found yet
    // Other -> Failed or Cancelled
    const statusCode = data.status ?? data.code;
    const transStatus = data.transaction?.status ?? statusCode;
    
    let finalStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' = 'PENDING';
    
    if (transStatus === '0' || transStatus === 0 || data.transaction?.status === '0') {
      finalStatus = 'SUCCESS';
    } else if (transStatus === '1' || transStatus === 1 || data.code === '1') {
      finalStatus = 'PENDING';
    } else {
      finalStatus = 'FAILED';
    }

    return {
      success: finalStatus === 'SUCCESS',
      status: finalStatus,
      message: data.message || (finalStatus === 'SUCCESS' ? 'Paiement confirmé !' : 'Paiement non encore détecté ou en cours.'),
      orderNumber: data.orderNumber || data.transaction?.orderNumber || reference,
      isSimulated: false
    };

  } catch (error: any) {
    console.error("Failed to check FlexPay status:", error);
    return {
      success: false,
      status: 'PENDING',
      message: "Vérification en cours... Veuillez re-tester dans quelques instants."
    };
  }
}
