import { useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { FaLightbulb } from 'react-icons/fa';

// ✅ REAL Code128 Barcode Generator
const generateCode128Barcode = (code, height = 40) => {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, code, {
      format: 'CODE128',
      width: 2,
      height: height,
      displayValue: false,
      fontSize: 0,
      margin: 0,
      background: '#ffffff',
      lineColor: '#000000',
    });
  } catch (error) {
    console.error('Barcode generation error:', error);
    const ctx = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(code, canvas.width / 2, canvas.height / 2);
  }
  return canvas.toDataURL('image/png');
};

// ✅ Format price with commas
const formatPrice = (price) => {
  return new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

/**
 * BarcodeGenerator
 *
 * Props:
 *   barcode       – barcode string
 *   item_name     – product name
 *   product_id    – numeric primary key (shown as #1, #2 …)
 *   selling_price – REAL (non-discounted) price shown on label
 *   sub_brands    – comma-separated compatible brands  e.g. "HP,DELL,ASUS,MSI"
 *   onPrint       – optional callback
 */
const BarcodeGenerator = ({ barcode, item_name, product_id, selling_price, sub_brands, onPrint }) => {
  // Use the real selling_price on the label — NOT the discounted price
  const price = selling_price || 0;
  const formattedPrice = formatPrice(price);
  const displayName = item_name || '';
  const idLabel = product_id ? `#${product_id}` : '';

  // sub_brands: comma-separated string → array, max 4 items, max 20 chars each
  const brandLines = (sub_brands || '')
    .split(',')
    .map((s) => s.trim().slice(0, 20))
    .filter(Boolean)
    .slice(0, 4);

  // ── Print handler ──────────────────────────────────────────────────────
  const handlePrint = () => {
    const barcodeImage = generateCode128Barcode(barcode, 40);
    const printWindow = window.open('', '_blank', 'width=300,height=200');

    const brandsHTML = brandLines
      .map((line) => `<div class="brand-line">${line}</div>`)
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${barcode}</title>
        <style>
          @page {
            size: 50mm 30mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            width: 50mm;
            height: 30mm;
            overflow: hidden;
            background: #fff;
            color: #000;
            font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
          }
          .label {
            width: 50mm;
            height: 30mm;
            padding: 1.2mm 1.5mm 1mm 1.5mm;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          /* ── Row 1: Company (left) + #ID (right) ── */
          .header-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 0.8mm;
            border-bottom: 0.25mm solid #000;
            flex-shrink: 0;
            line-height: 1;
          }
          .company-name {
            font-size: 5.5pt;
            font-weight: 700;
            letter-spacing: 0.2px;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
          }
          .primary-id {
            font-size: 5.5pt;
            font-weight: 700;
            white-space: nowrap;
            flex-shrink: 0;
            margin-left: 2mm;
          }

          /* ── Row 2: Item name ── */
          .item-name-row {
            text-align: center;
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            line-height: 1.1;
            padding: 0.6mm 0 0.4mm 0;
            flex-shrink: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* ── Row 3: Barcode ── */
          .barcode-row {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }
          .barcode-img {
            width: 100%;
            height: 10mm;
            object-fit: fill;
            image-rendering: pixelated;
            display: block;
          }
          .barcode-num {
            font-family: 'Courier New', Courier, monospace;
            font-size: 5.5pt;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-align: center;
            margin-top: 0.3mm;
            line-height: 1;
          }

          /* ── Row 4: Brands (left) + Price (right) ── */
          .bottom-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
            flex: 1;
            padding-top: 0.8mm;
            min-height: 0;
            overflow: hidden;
          }
          .brands-col {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: flex-start;
            flex: 1;
            min-width: 0;
            overflow: hidden;
          }
          .brand-line {
            font-size: 5pt;
            font-weight: 500;
            color: #000;
            line-height: 1.25;
            white-space: nowrap;
          }
          .price-block {
            flex-shrink: 0;
            text-align: right;
            line-height: 1;
          }
          .price-label {
            font-size: 5.5pt;
            font-weight: 700;
            color: #000;
            white-space: nowrap;
          }
          .price-amount {
            font-size: 10pt;
            font-weight: 800;
            color: #000;
            white-space: nowrap;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="label">

          <!-- Row 1: Company (left) + #ID (right) -->
          <div class="header-row">
            <div class="company-name">SAMAGI MOTORS &ndash; KUMBUKGATE</div>
            <div class="primary-id">${idLabel}</div>
          </div>

          <!-- Row 2: Item Name -->
          <div class="item-name-row">${displayName}</div>

          <!-- Row 3: Barcode -->
          <div class="barcode-row">
            <img src="${barcodeImage}" class="barcode-img" alt="barcode" />
            <div class="barcode-num">${barcode}</div>
          </div>

          <!-- Row 4: Brands + Price -->
          <div class="bottom-row">
            <div class="brands-col">
              ${brandsHTML}
            </div>
            <div class="price-block">
              <span class="price-label">LKR</span>
              <span class="price-amount">${formattedPrice}</span>
            </div>
          </div>

        </div>

        <script>
          window.onload = function () {
            setTimeout(() => { window.print(); }, 300);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
    if (onPrint) onPrint();
  };

  // ── UI Preview ─────────────────────────────────────────────────────────
  const previewImage = generateCode128Barcode(barcode, 30);

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
      {/* Preview card — proportional to 50×30mm */}
      <div
        style={{
          width: '250px',
          height: '150px',
          border: '1px solid #aaa',
          borderRadius: '3px',
          padding: '5px 7px 4px 7px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#fff',
          boxSizing: 'border-box',
          fontFamily: 'Arial, Helvetica Neue, Helvetica, sans-serif',
        }}
      >
        {/* Row 1: Company (left) + #ID (right) */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '0.5px solid #000',
          paddingBottom: '2px',
          lineHeight: 1,
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: '7px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            SAMAGI MOTORS – KUMBUKGATE
          </div>
          {idLabel && (
            <div style={{
              fontSize: '7px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              marginLeft: '4px',
              flexShrink: 0,
            }}>
              {idLabel}
            </div>
          )}
        </div>

        {/* Row 2: Item name */}
        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          lineHeight: 1.1,
          padding: '3px 0 2px 0',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {displayName}
        </div>

        {/* Row 3: Barcode */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <img
            src={previewImage}
            alt="Barcode preview"
            style={{ width: '100%', height: '28px', imageRendering: 'pixelated', display: 'block', objectFit: 'fill' }}
          />
          <div style={{
            fontFamily: 'Courier New, monospace',
            fontSize: '7px',
            fontWeight: 600,
            letterSpacing: '1.5px',
            textAlign: 'center',
            marginTop: '1px',
            lineHeight: 1,
          }}>
            {barcode}
          </div>
        </div>

        {/* Row 4: Brands (left) + Price (right) */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flex: 1,
          paddingTop: '3px',
          minHeight: 0,
          overflow: 'hidden',
        }}>
          {/* Brands */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1, minWidth: 0 }}>
            {brandLines.map((line, i) => (
              <div key={i} style={{ fontSize: '6px', fontWeight: 500, lineHeight: 1.25, whiteSpace: 'nowrap' }}>
                {line}
              </div>
            ))}
          </div>

          {/* Price */}
          <div style={{ textAlign: 'right', flexShrink: 0, lineHeight: 1 }}>
            <span style={{ fontSize: '6px', fontWeight: 700 }}>LKR </span>
            <span style={{ fontSize: '13px', fontWeight: 800, display: 'block' }}>{formattedPrice}</span>
          </div>
        </div>
      </div>

      {/* Item name reference below preview */}
      <p className="text-[10px] text-gray-500 text-center max-w-[240px] truncate">
        {item_name}{idLabel ? ` · ${idLabel}` : ''}
      </p>

      {/* Print Button */}
      <button
        onClick={handlePrint}
        className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
        title="Print 50mm × 30mm barcode label"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print Label (50×30mm)
      </button>

      {/* Tipsss */}
      <p className="text-[9px] text-gray-400 text-center flex items-center justify-center gap-1">
        <FaLightbulb className="w-3 h-3 text-amber-500 shrink-0" />
        <span>50mm × 30mm thermal label · DPI 203 or 300 · Real price shown (not discounted)</span>
      </p>
    </div>
  );
};

export default BarcodeGenerator;