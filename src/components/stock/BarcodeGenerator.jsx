import { useEffect, useRef } from 'react';

// Simple barcode generator using CSS (no external library needed)
const BarcodeGenerator = ({ barcode, item_name, onPrint }) => {
  const barcodeRef = useRef(null);
  
  // Generate Code128-style bars using CSS
  const generateBars = (code) => {
    // Simple hash-based bar pattern (for demo - use jsbarcode in production)
    const bars = [];
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate 30 bars based on hash
    for (let i = 0; i < 30; i++) {
      const width = ((hash >> i) & 3) + 1; // 1-4px width
      const spacing = ((hash >> (i + 5)) & 1) ? 2 : 1;
      bars.push({ width, spacing, key: i });
    }
    return bars;
  };
  
  const bars = generateBars(barcode);
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${barcode}</title>
        <style>
          body { font-family: monospace; text-align: center; padding: 20px; }
          .barcode { display: inline-block; margin: 20px 0; }
          .bar { display: inline-block; background: #000; height: 50px; margin-right: 1px; }
          .barcode-text { font-size: 14px; font-weight: bold; margin-top: 5px; }
          .item-name { font-size: 12px; color: #666; margin-bottom: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="item-name">${item_name}</div>
        <div class="barcode">
          ${bars.map(bar => 
            `<div class="bar" style="width:${bar.width}px;margin-right:${bar.spacing}px"></div>`
          ).join('')}
        </div>
        <div class="barcode-text">${barcode}</div>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
      {/* Visual Barcode Preview */}
      <div className="flex items-end gap-px h-12" ref={barcodeRef}>
        {bars.map((bar) => (
          <div
            key={bar.key}
            className="bg-gray-900"
            style={{ 
              width: `${bar.width}px`, 
              marginRight: `${bar.spacing}px`,
              height: `${12 + (bar.width * 3)}px`
            }}
          />
        ))}
      </div>
      
      {/* Barcode Text */}
      <div className="text-sm font-mono font-bold text-gray-800 tracking-wider">
        {barcode}
      </div>
      
      {/* Item Name */}
      <div className="text-xs text-gray-500 truncate max-w-[150px]">
        {item_name}
      </div>
      
      {/* Print Button */}
      <button
        onClick={handlePrint}
        className="mt-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print Barcode
      </button>
    </div>
  );
};

export default BarcodeGenerator;