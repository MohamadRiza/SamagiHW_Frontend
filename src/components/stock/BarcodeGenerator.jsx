import { useEffect, useRef } from 'react';

const BarcodeGenerator = ({ barcode, item_name, short_form, final_price, onPrint }) => {
  const canvasRef = useRef(null);
  
  // Generate Code128-style bars using canvas for crisp printing
  const generateBarcodeCanvas = (code, width = 200, height = 50) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const barWidth = 2;
    const totalBars = 30;
    
    canvas.width = width;
    canvas.height = height;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Generate deterministic bars from barcode string
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Draw bars
    let x = 10;
    for (let i = 0; i < totalBars; i++) {
      const barHeight = ((hash >> i) & 3) + 1; // 1-4
      const spacing = ((hash >> (i + 5)) & 1) ? 3 : 2;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, 5, barWidth, height - 15);
      
      x += barWidth + spacing;
      if (x > width - 10) break;
    }
    
    return canvas.toDataURL('image/png');
  };
  
  // Format price with LKR and commas
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price).replace('LKR', 'LKR').trim();
  };
  
  const handlePrint = () => {
    const barcodeImage = generateBarcodeCanvas(barcode);
    const price = final_price || 0;
    
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${barcode}</title>
        <style>
          @page { size: 3.5in 2in; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            width: 3.5in;
            height: 2in;
            padding: 0.15in;
            background: #fff;
            color: #000;
          }
          .label-container {
            border: 1px solid #000;
            padding: 8px;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .company-name {
            text-align: center;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 4px;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 4px;
          }
          .barcode-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
          }
          .barcode-image {
            width: 100%;
            max-width: 180px;
            height: 40px;
            object-fit: contain;
            image-rendering: pixelated;
          }
          .barcode-number {
            font-family: 'Courier New', monospace;
            font-weight: 700;
            font-size: 10px;
            letter-spacing: 2px;
            text-align: center;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 4px;
            padding-top: 4px;
            border-top: 1px solid #eee;
          }
          .short-form {
            font-size: 9px;
            font-weight: 600;
            color: #333;
            text-transform: uppercase;
          }
          .price {
            font-size: 10px;
            font-weight: 700;
            color: #000;
          }
          .price .currency {
            font-size: 8px;
            vertical-align: super;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <!-- Company Name (Top Center) -->
          <div class="company-name">Samagi Hardware</div>
          
          <!-- Barcode Section -->
          <div class="barcode-section">
            <img src="${barcodeImage}" alt="barcode" class="barcode-image" />
            <div class="barcode-number">${barcode}</div>
          </div>
          
          <!-- Bottom Row: Short Form (Left) | Price (Right) -->
          <div class="info-row">
            <div class="short-form">${short_form || item_name?.substring(0, 10) || ''}</div>
            <div class="price">
              <span class="currency">LKR</span> ${price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            </div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
              // Optional: close after print dialog
              // window.close();
            }, 300);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  // Preview barcode image for UI
  const previewImage = generateBarcodeCanvas(barcode);
  
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
      {/* Preview */}
      <div className="border border-gray-300 p-3 rounded bg-gray-50">
        <p className="text-xs font-bold text-center text-gray-700 mb-2 uppercase tracking-wide">
          Samagi Hardware
        </p>
        <img 
          src={previewImage} 
          alt="Barcode preview" 
          className="mx-auto mb-1" 
          style={{ width: '180px', height: '40px', imageRendering: 'pixelated' }}
        />
        <p className="text-xs font-mono font-bold text-center text-gray-800 tracking-widest mb-2">
          {barcode}
        </p>
        <div className="flex justify-between items-end text-xs">
          <span className="font-semibold text-gray-700 uppercase">
            {short_form || item_name?.substring(0, 8)}
          </span>
          <span className="font-bold text-gray-900">
            LKR {final_price?.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") || '0.00'}
          </span>
        </div>
      </div>
      
      {/* Item Name (for reference) */}
      <p className="text-xs text-gray-500 text-center max-w-[200px] truncate">
        {item_name}
      </p>
      
      {/* Print Button */}
      <button
        onClick={handlePrint}
        className="btn-primary flex items-center gap-2 text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print Barcode Label
      </button>
      
      {/* Print Tips */}
      <p className="text-[10px] text-gray-400 text-center">
        💡 Use 3.5" × 2" label paper for best results
      </p>
    </div>
  );
};

export default BarcodeGenerator;