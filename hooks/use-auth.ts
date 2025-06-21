import { useAccount, useDisconnect } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function useAuth() {
  const { address, isConnected, isConnecting } = useAccount()
  const { disconnect } = useDisconnect()
  const router = useRouter()

  // Clear QR validation if wallet is disconnected
  useEffect(() => {
    if (!isConnected) {
      localStorage.removeItem('qr_validated')
      localStorage.removeItem('qr_response')
    }
  }, [isConnected])

  const logout = () => {
    // Clear QR validation when logging out
    localStorage.removeItem('qr_validated')
    localStorage.removeItem('qr_response')
    disconnect()
    router.push('/')
  }

  return {
    isAuthenticated: isConnected && !!address,
    isLoading: isConnecting,
    address,
    isConnected,
    logout,
  }
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

  return { isAuthenticated, isLoading, logout }
}

export function useRedirectIfAuthenticated() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Check if user has completed QR validation
      const qrValidated = localStorage.getItem('qr_validated') === 'true'
      console.log('useRedirectIfAuthenticated: isAuthenticated =', isAuthenticated, 'qrValidated =', qrValidated);
      
      // Add a small delay to prevent race conditions
      const timer = setTimeout(() => {
        if (qrValidated) {
          console.log('Redirecting to home - QR already validated');
          router.replace('/home')
        } else {
          console.log('Redirecting to scanning page - QR not validated');
          router.replace('/scanning-page')
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, router])

  return { isAuthenticated, isLoading }
}

export function useQRValidation() {
  const [isQRValidated, setIsQRValidated] = useState(false)
  const [qrResponse, setQrResponse] = useState<any>(null)

  useEffect(() => {
    // Check localStorage on component mount
    const qrValidated = localStorage.getItem('qr_validated') === 'true'
    const storedQrResponse = localStorage.getItem('qr_response')
    
    console.log('QR validation hook initialized, current state:', qrValidated);
    console.log('Stored QR response:', storedQrResponse);
    
    setIsQRValidated(qrValidated)
    if (storedQrResponse) {
      try {
        setQrResponse(JSON.parse(storedQrResponse))
      } catch (e) {
        console.error('Failed to parse stored QR response:', e)
      }
    }

    // Listen for localStorage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'qr_validated') {
        const qrValidated = e.newValue === 'true'
        console.log('Storage change detected, new QR validation state:', qrValidated);
        setIsQRValidated(qrValidated)
      }
      if (e.key === 'qr_response' && e.newValue) {
        try {
          setQrResponse(JSON.parse(e.newValue))
        } catch (error) {
          console.error('Failed to parse QR response from storage change:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const setQRValidated = (validated: boolean, response?: any) => {
    console.log('Setting QR validated to:', validated, 'with response:', response);
    
    // Store both validation state and response
    localStorage.setItem('qr_validated', validated.toString())
    if (response) {
      localStorage.setItem('qr_response', JSON.stringify(response))
      setQrResponse(response)
    }
    
    setIsQRValidated(validated)
    
    // Trigger a custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('qr-validation-changed', { 
      detail: { validated, response } 
    }))
  }

  const clearQRValidation = () => {
    console.log('Clearing QR validation');
    localStorage.removeItem('qr_validated')
    localStorage.removeItem('qr_response')
    setIsQRValidated(false)
    setQrResponse(null)
    
    // Trigger a custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('qr-validation-changed', { 
      detail: { validated: false, response: null } 
    }))
  }

  useEffect(() => {
    const handleCustomEvent = (event: CustomEvent) => {
      console.log('Custom QR validation event received:', event.detail);
      const { validated, response } = event.detail
      setIsQRValidated(validated)
      if (response) {
        setQrResponse(response)
      }
    }

    window.addEventListener('qr-validation-changed', handleCustomEvent as EventListener)
    
    return () => {
      window.removeEventListener('qr-validation-changed', handleCustomEvent as EventListener)
    }
  }, [])

  return { isQRValidated, qrResponse, setQRValidated, clearQRValidation }
}
