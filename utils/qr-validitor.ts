interface QRApiResponse {
    reference_id: string;
    last_4_digits: string;
    is_valid: boolean;
  }
  
  interface QRValidationResponse {
    success: boolean;
    message: string;
  }
  
  
  export async function validateQRCode(qrData: string): Promise<QRValidationResponse> {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_QR_API_URL || "http://localhost:8080/process-qr", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'include',
        body: JSON.stringify({ qr_data: qrData }),
      });
  
      if (!response.ok) {
        // throw new Error(`HTTP error! status: ${response.status}`);
        return {
          success: false,
          message: 'HTTP error'
        };
      }
  
      const data = await response.json() as QRApiResponse;
      return {
        success: data.is_valid,
        message: data.is_valid 
          ? `Valid QR Code (Ref: ${data.reference_id})` 
          : 'Invalid QR Code'
      };
    } catch (error) {
      console.error('QR validation error:', error);
      return {
        success: false,
        message: 'Not a valid aadhar qr'
      };
    }
  }
  