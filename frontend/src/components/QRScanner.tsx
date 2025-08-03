import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Camera, 
  X, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Scan,
  Package,
  ShoppingCart,
  Plus
} from 'lucide-react';
import { apiService } from '../services/api';

interface QRScannerProps {
  onClose: () => void;
  onProductScanned?: (product: any) => void;
  onOrderScanned?: (order: any) => void;
  onCustomerScanned?: (customer: any) => void;
  onCustomerNotFound?: () => void;
  mode: 'product' | 'order' | 'both' | 'customer';
  alwaysOn?: boolean;
  embedded?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ 
  onClose, 
  onProductScanned, 
  onOrderScanned, 
  onCustomerScanned, 
  onCustomerNotFound, 
  mode, 
  alwaysOn = false, 
  embedded = false 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      setIsScanning(true);
      setError('');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError('Camera access denied or not available');
      setIsScanning(false);
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const handleManualScan = async () => {
    if (!manualInput.trim()) {
      toast.error('Please enter a QR code or barcode');
      return;
    }
    
    await processScanData(manualInput.trim());
  };

  const processScanData = async (data: string) => {
    try {
      setScannedData(data);
      setScanResult(null);
      
      // Handle customer QR codes
      if (mode === 'customer') {
        try {
          // Try to find customer by QR code
          const response = await fetch(`http://localhost:8080/api/v1/customers/qr/${encodeURIComponent(data)}`);
          if (response.ok) {
            const customer = await response.json();
            setScanResult({ type: 'customer', data: customer });
            if (onCustomerScanned) {
              onCustomerScanned(customer);
              toast.success(`Customer found: ${customer.name}`);
            }
            return;
          } else {
            throw new Error('Customer not found');
          }
        } catch (error) {
          if (onCustomerNotFound) {
            onCustomerNotFound();
          }
          toast.error('Customer not found');
          return;
        }
      }
      
      // First, try to scan as QR code via API for products/orders
      try {
        const response = await apiService.scanQR(data) as any;
        setScanResult(response);
        
        if (response.type === 'product' && onProductScanned) {
          onProductScanned(response.data);
          toast.success(`Product found: ${response.data.name}`);
          
          // For always-on scanner, don't close automatically
          if (!alwaysOn) {
            setTimeout(() => onClose(), 1000);
          }
        } else if (response.type === 'order' && onOrderScanned) {
          onOrderScanned(response.data);
          toast.success(`Order found: ${response.data.order_number}`);
        }
      } catch (apiError) {
        throw new Error('QR code or barcode not found');
      }
    } catch (error) {
      console.error('Scan processing error:', error);
      setError('QR code or barcode not recognized');
      toast.error('QR code or barcode not recognized');
    }
  };

  // Simple QR code detection simulation
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // In a real implementation, you would use a QR code library like jsQR
    // For demo purposes, we'll simulate scanning
    const simulatedQRData = generateSimulatedQRData();
    if (simulatedQRData) {
      processScanData(simulatedQRData);
    }
  };

  const generateSimulatedQRData = (): string | null => {
    // Simulate finding a QR code randomly (for demo purposes)
    if (Math.random() > 0.98) { // 2% chance per frame (reduced for less frequent simulation)
      // Generate a simulated barcode
      return `SIM${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    }
    return null;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isScanning && videoRef.current) {
      interval = setInterval(captureFrame, 100); // Check every 100ms
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning]);

  useEffect(() => {
    // Auto-start camera for always-on or embedded mode
    if (alwaysOn || embedded) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [alwaysOn, embedded]);

  const getModeIcon = () => {
    switch (mode) {
      case 'product':
        return <Package className="w-5 h-5" />;
      case 'order':
        return <ShoppingCart className="w-5 h-5" />;
      case 'customer':
        return <Plus className="w-5 h-5" />;
      default:
        return <Scan className="w-5 h-5" />;
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'product':
        return alwaysOn ? 'Product Scanner (Always On)' : 'Scan Product';
      case 'order':
        return 'Scan Order';
      case 'customer':
        return 'Scan Customer QR';
      default:
        return 'QR Code Scanner';
    }
  };

  const containerClass = embedded 
    ? "w-full" 
    : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50";
  
  const modalClass = embedded
    ? "bg-white rounded-lg shadow-lg w-full"
    : "bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden";

  return (
    <div className={containerClass}>
      <div className={modalClass}>
        {/* Header */}
        {!embedded && (
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              {getModeIcon()}
              <h2 className="text-lg font-semibold">{getModeTitle()}</h2>
              {alwaysOn && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">Live</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              disabled={alwaysOn}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Camera Controls */}
          <div className="flex space-x-2">
            <button
              onClick={isScanning ? stopCamera : startCamera}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                isScanning 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <Camera className="w-4 h-4 mr-2 inline" />
              {isScanning ? 'Stop Camera' : 'Start Camera'}
            </button>
            {isScanning && (
              <button
                onClick={captureFrame}
                className="py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Camera View */}
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {/* Scanning Overlay */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-green-500 w-48 h-48 rounded-lg">
                  <div className="w-full h-full border-2 border-green-500 border-dashed rounded-lg animate-pulse"></div>
                </div>
              </div>
            )}
            
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-75">Camera not active</p>
                </div>
              </div>
            )}
          </div>

          {/* Manual Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Or enter manually:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter QR code or barcode"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
              />
              <button
                onClick={handleManualScan}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Scan className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-800">Scan Successful!</h3>
              </div>
              
              {scanResult.type === 'product' && (
                <div className="space-y-2">
                  <p className="text-sm text-green-700">
                    <strong>Product:</strong> {scanResult.data.name}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Price:</strong> ₱{scanResult.data.price}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Stock:</strong> {scanResult.data.stock} units
                  </p>
                  {onProductScanned && (
                    <button
                      onClick={() => {
                        onProductScanned(scanResult.data);
                        onClose();
                      }}
                      className="mt-2 flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </button>
                  )}
                </div>
              )}
              
              {scanResult.type === 'order' && (
                <div className="space-y-2">
                  <p className="text-sm text-green-700">
                    <strong>Order:</strong> {scanResult.data.order_number}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Status:</strong> {scanResult.data.status}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Total:</strong> ₱{scanResult.data.total}
                  </p>
                </div>
              )}
              
              {scanResult.type === 'customer' && (
                <div className="space-y-2">
                  <p className="text-sm text-green-700">
                    <strong>Customer:</strong> {scanResult.data.name}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Phone:</strong> {scanResult.data.phone}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Email:</strong> {scanResult.data.email}
                  </p>
                  {(scanResult.data.isSeniorCitizen || scanResult.data.isPWD) && (
                    <p className="text-sm text-blue-700">
                      <strong>Discount Eligible:</strong> {scanResult.data.isSeniorCitizen && 'Senior Citizen'} 
                      {scanResult.data.isSeniorCitizen && scanResult.data.isPWD && ' • '}
                      {scanResult.data.isPWD && 'PWD'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Scanned Data Display */}
          {scannedData && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Scanned Data:</strong> {scannedData}
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Point camera at QR code or barcode</p>
            <p>• Ensure good lighting for better scanning</p>
            <p>• Hold device steady when scanning</p>
            {mode === 'product' && <p>• Product barcodes will be automatically added to cart</p>}
            {mode === 'order' && <p>• Order QR codes will show order details</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;