import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { FaBoxOpen, FaTimes, FaCheck } from 'react-icons/fa';

// Format LKR Currency
const formatLKR = (amount) =>
  `LKR ${(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const ProductConfirmationModal = ({ product, isOpen, onClose, onConfirm, formatCurrency = formatLKR }) => {
  const [quantity, setQuantity] = useState(1);
  const [discountMode, setDiscountMode] = useState('default');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountLKR, setDiscountLKR] = useState(0);
  const [focusedField, setFocusedField] = useState('quantity');

  const modalRef = useRef(null);
  const qtyInputRef = useRef(null);
  const discountInputRef = useRef(null);

  const unitPrice = product?.selling_price || 0;
  const maxStock = product?.stock_quantity || 0;
  const autoDiscount =
    product?.discount_type === 'percent'
      ? (unitPrice * (product.discount_value || 0)) / 100
      : product?.discount_value || 0;

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setDiscountMode('default');
      setDiscountValue(product?.discount_value || 0);
      setDiscountLKR(autoDiscount);
      setFocusedField('quantity');

      setTimeout(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }, 50);
    }
  }, [isOpen, product, autoDiscount]);

  useEffect(() => {
    if (discountMode === 'default') {
      setDiscountLKR(autoDiscount);
      setDiscountValue(product?.discount_value || 0);
    } else if (discountMode === 'percent') {
      const val = Math.min(100, Math.max(0, discountValue));
      setDiscountLKR((unitPrice * val) / 100);
    } else if (discountMode === 'fixed') {
      const val = Math.min(unitPrice, Math.max(0, discountValue));
      setDiscountLKR(val);
    }
  }, [discountMode, discountValue, unitPrice, autoDiscount, product]);

  const handleQuantityChange = (val) => {
    const qty = parseInt(val, 10) || 1;
    setQuantity(Math.min(Math.max(1, qty), maxStock));
  };

  const handleDiscountValueChange = (val) => {
    const num = parseFloat(val) || 0;
    if (discountMode === 'percent') {
      setDiscountValue(Math.min(100, Math.max(0, num)));
    } else {
      setDiscountValue(Math.min(unitPrice, Math.max(0, num)));
    }
  };

  const handleConfirm = () => {
    if (maxStock <= 0) {
      toast.error('⚠️ Product is out of stock');
      return;
    }
    if (quantity > maxStock) {
      toast.error(`⚠️ Max stock available: ${maxStock}`);
      return;
    }

    onConfirm({
      quantity,
      discountMode,
      discountValue: discountMode === 'default' ? product?.discount_value || 0 : discountValue,
      discountType: discountMode === 'default' ? product?.discount_type || 'fixed' : discountMode,
      discountLKR: discountMode === 'default' ? autoDiscount : discountLKR,
    });
    onClose();
  };

  const handleKeyDown = (e) => {
    if (focusedField === 'quantity') {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleQuantityChange(quantity + 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleQuantityChange(quantity - 1);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        setFocusedField('discountMode');
      }
    }

    if (focusedField === 'discountMode') {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const modes = ['default', 'percent', 'fixed'];
        const currentIndex = modes.indexOf(discountMode);
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        const newIndex = (currentIndex + direction + modes.length) % modes.length;
        setDiscountMode(modes[newIndex]);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (discountMode === 'default') {
          handleConfirm();
        } else {
          setFocusedField('discountValue');
          setTimeout(() => {
            discountInputRef.current?.focus();
            discountInputRef.current?.select();
          }, 10);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setFocusedField('quantity');
        qtyInputRef.current?.focus();
      }
    }

    if (focusedField === 'discountValue' && discountMode !== 'default') {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const increment = 1;
        handleDiscountValueChange(discountValue + increment);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const decrement = 1;
        handleDiscountValueChange(discountValue - decrement);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape' || e.key === 'Tab') {
        e.preventDefault();
        setFocusedField('discountMode');
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    if (focusedField === 'quantity') {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    } else if (focusedField === 'discountValue' && discountMode !== 'default') {
      discountInputRef.current?.focus();
      discountInputRef.current?.select();
    }
  }, [focusedField, discountMode]);

  if (!isOpen || !product) return null;

  const itemTotal = unitPrice * quantity;
  const totalDiscount = discountLKR * quantity;
  const finalTotal = itemTotal - totalDiscount;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200 outline-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white text-base">
              <FaBoxOpen />
            </div>
            <div>
              <h3 id="product-modal-title" className="text-base font-bold text-white">
                Add to Cart
              </h3>
              <p className="text-[11px] text-white/80">Use ↑↓ to adjust, Enter to confirm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[75vh]">
          {/* Product Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-700 font-bold text-xl flex-shrink-0 shadow-sm">
              {(product?.item_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-base truncate">{product?.item_name || 'N/A'}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                  {product?.barcode || 'No barcode'}
                </span>
                {product?.company && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                    {product.company}
                  </span>
                )}
                {product?.short_form && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-100 text-primary-700 border border-primary-200">
                    {product.short_form}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-primary-700">{formatCurrency(unitPrice)}</p>
              <p
                className={`text-[11px] font-medium ${
                  maxStock <= 0 ? 'text-red-600 font-bold' : maxStock <= 10 ? 'text-amber-600' : 'text-green-600'
                }`}
              >
                {maxStock <= 0 ? 'Out of Stock' : `Stock: ${maxStock}`}
              </p>
            </div>
          </div>

          {/* 2-Column Grid for Quantity & Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Quantity Selector */}
            <div
              className={`p-3 rounded-xl border-2 transition-all ${
                focusedField === 'quantity'
                  ? 'border-primary-500 bg-primary-50/30 ring-2 ring-primary-200'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                <span>Quantity</span>
                {focusedField === 'quantity' && (
                  <span className="text-[10px] text-primary-600 font-normal">Active (↑↓)</span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="w-9 h-9 rounded-lg border border-gray-300 hover:border-primary-500 hover:bg-primary-50 flex items-center justify-center text-lg font-bold text-gray-700 transition-colors disabled:opacity-50"
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <input
                  ref={qtyInputRef}
                  type="number"
                  min="1"
                  max={maxStock}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  onFocus={() => setFocusedField('quantity')}
                  className="flex-1 text-center text-lg font-bold border border-gray-300 rounded-lg py-1 focus:ring-2 focus:ring-primary-500 outline-none"
                  aria-label="Quantity input"
                  disabled={maxStock <= 0}
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="w-9 h-9 rounded-lg border border-gray-300 hover:border-primary-500 hover:bg-primary-50 flex items-center justify-center text-lg font-bold text-gray-700 transition-colors disabled:opacity-50"
                  disabled={quantity >= maxStock || maxStock <= 0}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Max: {maxStock} • Press Enter →</p>
            </div>

            {/* Discount Controls */}
            <div
              className={`p-3 rounded-xl border-2 transition-all ${
                focusedField === 'discountMode' || focusedField === 'discountValue'
                  ? 'border-primary-500 bg-primary-50/30 ring-2 ring-primary-200'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                <span>Discount</span>
                {(focusedField === 'discountMode' || focusedField === 'discountValue') && (
                  <span className="text-[10px] text-primary-600 font-normal">Active</span>
                )}
              </label>
              <div className="space-y-2">
                <select
                  value={discountMode}
                  onChange={(e) => {
                    setDiscountMode(e.target.value);
                    if (e.target.value === 'default') {
                      handleConfirm();
                    } else {
                      setFocusedField('discountValue');
                    }
                  }}
                  onFocus={() => setFocusedField('discountMode')}
                  className={`w-full text-xs border rounded-lg py-1.5 px-2 bg-white focus:ring-2 focus:ring-primary-500 font-medium outline-none ${
                    focusedField === 'discountMode'
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-gray-300'
                  }`}
                  aria-label="Discount mode selection"
                >
                  <option value="default">
                    Auto Discount ({product?.discount_value}
                    {product?.discount_type === 'percent' ? '%' : ''})
                  </option>
                  <option value="percent">Manual Percentage (%)</option>
                  <option value="fixed">Manual Amount (LKR)</option>
                </select>

                {discountMode !== 'default' && (
                  <div className="relative">
                    <input
                      ref={discountInputRef}
                      type="number"
                      min="0"
                      step={discountMode === 'percent' ? '1' : '0.01'}
                      max={discountMode === 'percent' ? '100' : unitPrice}
                      value={discountValue}
                      onChange={(e) => handleDiscountValueChange(e.target.value)}
                      onFocus={() => setFocusedField('discountValue')}
                      className={`w-full text-right text-xs border rounded-lg py-1.5 px-2 pr-10 font-medium focus:ring-2 focus:ring-primary-500 outline-none ${
                        focusedField === 'discountValue'
                          ? 'border-primary-500 ring-2 ring-primary-200'
                          : 'border-gray-300'
                      }`}
                      placeholder={discountMode === 'percent' ? 'Enter %' : 'Enter LKR'}
                      aria-label={`Discount ${discountMode === 'percent' ? 'percentage' : 'amount'} input`}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      {discountMode === 'percent' ? '%' : 'LKR'}
                    </span>
                  </div>
                )}
              </div>
              {discountLKR > 0 && (
                <p className="text-[10px] text-green-700 font-semibold mt-1">
                  Per item: {formatCurrency(discountLKR)}
                </p>
              )}
            </div>
          </div>

          {/* Price Summary Bar */}
          <div className="p-3 bg-gradient-to-r from-gray-50 to-primary-50/20 rounded-xl border border-gray-200 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-gray-500 font-medium">
                Subtotal ({quantity} × {formatCurrency(unitPrice)}):{' '}
              </span>
              <span className="font-semibold text-gray-800">{formatCurrency(itemTotal)}</span>
              {totalDiscount > 0 && (
                <span className="ml-2 text-green-600 font-medium">(- {formatCurrency(totalDiscount)})</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-gray-500 mr-2">Total:</span>
              <span className="text-xl font-black text-primary-700">{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-bold rounded-xl transition-all hover:bg-gray-100"
          >
            Cancel (ESC)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={quantity > maxStock || maxStock <= 0}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaCheck /> Add to Cart (Enter)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductConfirmationModal;
