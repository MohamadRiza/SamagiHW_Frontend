import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import ProductService from '../services/product.service';
import BillService from '../services/bill.service';
import CustomerService from '../services/customer.service';
import CreditBillService from '../services/creditBill.service';
import { Toaster, toast } from 'react-hot-toast';
import { 
  FaPlus, 
  FaTimes, 
  FaMoneyBillWave, 
  FaBarcode, 
  FaShoppingCart, 
  FaUser, 
  FaBuilding, 
  FaSearch, 
  FaExclamationTriangle,
  FaCheck,
  FaBoxOpen,
  FaPercentage,
  FaMoneyCheckAlt
} from 'react-icons/fa';

// 🔊 Professional scan sound
const playScanSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 1200;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {}
};

// 🎨 Product Confirmation Modal Component - FULL KEYBOARD NAVIGATION
const ProductConfirmationModal = ({ product, isOpen, onClose, onConfirm, formatLKR }) => {
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
  const autoDiscount = product?.discount_type === 'percent'
    ? unitPrice * (product.discount_value || 0) / 100
    : product?.discount_value || 0;

  useEffect(() => {
    if (isOpen) {
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
      setDiscountLKR(unitPrice * val / 100);
    } else if (discountMode === 'fixed') {
      const val = Math.min(unitPrice, Math.max(0, discountValue));
      setDiscountLKR(val);
    }
  }, [discountMode, discountValue, unitPrice, autoDiscount, product]);

  const handleQuantityChange = (val) => {
    const qty = parseInt(val) || 1;
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
    if (quantity > maxStock) {
      toast.error(`⚠️ Max stock: ${maxStock}`);
      return;
    }
    
    onConfirm({
      quantity,
      discountMode,
      discountValue: discountMode === 'default' ? (product?.discount_value || 0) : discountValue,
      discountType: discountMode === 'default' ? (product?.discount_type || 'fixed') : discountMode,
      discountLKR: discountMode === 'default' ? autoDiscount : discountLKR
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
        const increment = discountMode === 'percent' ? 1 : 1;
        handleDiscountValueChange(discountValue + increment);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const decrement = discountMode === 'percent' ? 1 : 1;
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
              <h3 id="product-modal-title" className="text-base font-bold text-white">Add to Cart</h3>
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
                {product?.short_form && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary-100 text-primary-700 border border-primary-200">
                    {product.short_form}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-primary-700">{formatLKR(unitPrice)}</p>
              <p className={`text-[11px] font-medium ${maxStock <= 10 ? 'text-red-600' : 'text-green-600'}`}>
                Stock: {maxStock}
              </p>
            </div>
          </div>

          {/* 2-Column Grid for Quantity & Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Quantity Selector */}
            <div className={`p-3 rounded-xl border-2 transition-all ${focusedField === 'quantity' ? 'border-primary-500 bg-primary-50/30 ring-2 ring-primary-200' : 'border-gray-200 bg-gray-50'}`}>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                <span>Quantity</span>
                {focusedField === 'quantity' && <span className="text-[10px] text-primary-600 font-normal">Active (↑↓)</span>}
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
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="w-9 h-9 rounded-lg border border-gray-300 hover:border-primary-500 hover:bg-primary-50 flex items-center justify-center text-lg font-bold text-gray-700 transition-colors disabled:opacity-50"
                  disabled={quantity >= maxStock}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Max: {maxStock} • Press Enter →</p>
            </div>

            {/* Discount Controls */}
            <div className={`p-3 rounded-xl border-2 transition-all ${focusedField === 'discountMode' || focusedField === 'discountValue' ? 'border-primary-500 bg-primary-50/30 ring-2 ring-primary-200' : 'border-gray-200 bg-gray-50'}`}>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                <span>Discount</span>
                {(focusedField === 'discountMode' || focusedField === 'discountValue') && <span className="text-[10px] text-primary-600 font-normal">Active</span>}
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
                    focusedField === 'discountMode' ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-300'
                  }`}
                  aria-label="Discount mode selection"
                >
                  <option value="default">Auto Discount ({product?.discount_value}{product?.discount_type === 'percent' ? '%' : ''})</option>
                  <option value="percent">Manual Percentage (%)</option>
                  <option value="fixed">Manual Amount (LKR)</option>
                </select>
                
                {discountMode !== 'default' && (
                  <div className="relative">
                    <input
                      ref={discountInputRef}
                      type="number"
                      min="0"
                      step={discountMode === 'percent' ? "1" : "0.01"}
                      max={discountMode === 'percent' ? "100" : unitPrice}
                      value={discountValue}
                      onChange={(e) => handleDiscountValueChange(e.target.value)}
                      onFocus={() => setFocusedField('discountValue')}
                      className={`w-full text-right text-xs border rounded-lg py-1.5 px-2 pr-10 font-medium focus:ring-2 focus:ring-primary-500 outline-none ${
                        focusedField === 'discountValue' ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-300'
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
                <p className="text-[10px] text-green-700 font-semibold mt-1">Per item: {formatLKR(discountLKR)}</p>
              )}
            </div>
          </div>

          {/* Price Summary Bar */}
          <div className="p-3 bg-gradient-to-r from-gray-50 to-primary-50/20 rounded-xl border border-gray-200 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-gray-500 font-medium">Subtotal ({quantity} × {formatLKR(unitPrice)}): </span>
              <span className="font-semibold text-gray-800">{formatLKR(itemTotal)}</span>
              {totalDiscount > 0 && (
                <span className="ml-2 text-green-600 font-medium">(- {formatLKR(totalDiscount)})</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-gray-500 mr-2">Total:</span>
              <span className="text-xl font-black text-primary-700">{formatLKR(finalTotal)}</span>
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
            disabled={quantity > maxStock}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaCheck /> Add to Cart (Enter)
          </button>
        </div>
      </div>
    </div>
  );
};

// 🎨 Custom Item Confirmation Modal Component
const CustomItemConfirmationModal = ({ isOpen, onClose, onConfirm, initialName }) => {
  const [itemName, setItemName] = useState('');
  const [unitPrice, setUnitPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [discountLKR, setDiscountLKR] = useState(0);
  const [focusedField, setFocusedField] = useState('itemName');

  const nameInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const qtyInputRef = useRef(null);
  const discInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setItemName(initialName || '');
      setUnitPrice(0);
      setQuantity(1);
      setDiscountLKR(0);
      setFocusedField('itemName');
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialName]);

  const handleConfirm = () => {
    if (!itemName.trim()) {
      toast.error('⚠️ Item Name is required');
      return;
    }
    if (quantity <= 0) {
      toast.error('⚠️ Quantity must be greater than 0');
      return;
    }
    if (unitPrice < 0) {
      toast.error('⚠️ Unit Price cannot be negative');
      return;
    }
    if (discountLKR < 0) {
      toast.error('⚠️ Discount cannot be negative');
      return;
    }
    if (discountLKR > unitPrice) {
      toast.error('⚠️ Discount cannot exceed Unit Price');
      return;
    }

    onConfirm({
      product_name: itemName.trim(),
      unit_price: parseFloat(unitPrice) || 0,
      quantity: parseInt(quantity) || 1,
      discount_lkr: parseFloat(discountLKR) || 0
    });
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedField === 'itemName') {
        setFocusedField('unitPrice');
      } else if (focusedField === 'unitPrice') {
        setFocusedField('quantity');
      } else if (focusedField === 'quantity') {
        setFocusedField('discountLKR');
      } else if (focusedField === 'discountLKR') {
        handleConfirm();
      }
    }
  };

  useEffect(() => {
    if (focusedField === 'itemName') {
      nameInputRef.current?.focus();
    } else if (focusedField === 'unitPrice') {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    } else if (focusedField === 'quantity') {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    } else if (focusedField === 'discountLKR') {
      discInputRef.current?.focus();
      discInputRef.current?.select();
    }
  }, [focusedField]);

  if (!isOpen) return null;

  const itemTotal = (parseFloat(unitPrice) || 0) * (parseInt(quantity) || 0);
  const totalDiscount = (parseFloat(discountLKR) || 0) * (parseInt(quantity) || 0);
  const finalTotal = Math.max(0, itemTotal - totalDiscount);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200 outline-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg">
              <FaPlus />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Add Custom Item</h3>
              <p className="text-xs text-white/80">Press Enter to navigate fields, ESC to cancel</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Item Name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onFocus={() => setFocusedField('itemName')}
              placeholder="Enter product name..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-base font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Unit Price (LKR)</label>
              <input
                ref={priceInputRef}
                type="number"
                min="0"
                step="0.01"
                value={unitPrice || ''}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                onFocus={() => setFocusedField('unitPrice')}
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none font-semibold"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
              <input
                ref={qtyInputRef}
                type="number"
                min="1"
                value={quantity || ''}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                onFocus={() => setFocusedField('quantity')}
                placeholder="1"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Discount per Item (LKR)</label>
            <input
              ref={discInputRef}
              type="number"
              min="0"
              step="0.01"
              value={discountLKR || ''}
              onChange={(e) => setDiscountLKR(parseFloat(e.target.value) || 0)}
              onFocus={() => setFocusedField('discountLKR')}
              placeholder="0.00"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none font-semibold"
            />
          </div>

          {/* Pricing Preview */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mt-2 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal:</span>
              <span>LKR {itemTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-red-600">
              <span>Total Discount:</span>
              <span>- LKR {totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-2">
              <span>Net Total:</span>
              <span className="text-primary-700">LKR {finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all font-semibold">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all shadow-md font-bold">
            Add to Bill
          </button>
        </div>
      </div>
    </div>
  );
};


// 👤 Credit Customer Modal Component - FULL KEYBOARD NAVIGATION
const CreditCustomerModal = ({ isOpen, onClose, onConfirm, customers, formatLKR }) => {
  const [customerType, setCustomerType] = useState('existing');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  
  const [newCustomer, setNewCustomer] = useState({
    customer_type: 'individual',
    name: '',
    company_name: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    nic_id: ''
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  
  const [focusedField, setFocusedField] = useState('search');
  
  const modalRef = useRef(null);
  const searchInputRef = useRef(null);
  const dueDateInputRef = useRef(null);
  const notesInputRef = useRef(null);
  const newCustomerRefs = useRef({});

  useEffect(() => {
    if (isOpen) {
      setCustomerType('existing');
      setSearchCustomer('');
      setSelectedCustomer(null);
      setShowDropdown(false);
      setFilteredCustomers([]);
      setDropdownIndex(0);
      setNewCustomer({
        customer_type: 'individual',
        name: '',
        company_name: '',
        mobile: '',
        email: '',
        address: '',
        city: '',
        nic_id: ''
      });
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().slice(0, 10));
      setNotes('');
      setFocusedField('search');
      
      setTimeout(() => {
        if (customerType === 'existing') {
          searchInputRef.current?.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchCustomer.length < 1 || customerType !== 'existing' || !isOpen) {
      setShowDropdown(false);
      setFilteredCustomers([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        const response = await CustomerService.search(searchCustomer);
        if (response?.success && Array.isArray(response.data)) {
          const sorted = response.data.sort((a, b) => {
            const searchLower = searchCustomer.toLowerCase();
            const aName = a.name?.toLowerCase() || '';
            const bName = b.name?.toLowerCase() || '';
            const aMobile = a.mobile?.toLowerCase() || '';
            const bMobile = b.mobile?.toLowerCase() || '';
            const aCompany = a.company_name?.toLowerCase() || '';
            const bCompany = b.company_name?.toLowerCase() || '';
            
            const score = (str) => {
              if (str === searchLower) return 3;
              if (str.startsWith(searchLower)) return 2;
              if (str.includes(searchLower)) return 1;
              return 0;
            };
            
            const aScore = Math.max(score(aName), score(aMobile), score(aCompany));
            const bScore = Math.max(score(bName), score(bMobile), score(bCompany));
            
            return bScore - aScore;
          });
          
          setFilteredCustomers(sorted);
          setShowDropdown(true);
          setDropdownIndex(0);
        } else {
          setFilteredCustomers([]);
          setShowDropdown(false);
        }
      } catch (error) {
        console.error('Search customers error:', error);
        setFilteredCustomers([]);
        setShowDropdown(false);
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [searchCustomer, customerType, isOpen]);

  const handleCreateCustomer = async () => {
    const name = newCustomer.name?.trim();
    const mobile = newCustomer.mobile?.trim();
    const address = newCustomer.address?.trim();
    
    if (!name || !mobile || !address) {
      toast.error('❌ Please fill required fields: Name, Mobile, Address');
      return null;
    }
    
    if (!/^07[01245678]\d{7}$/.test(mobile)) {
      toast.error('❌ Invalid mobile format. Use: 07X XXX XXXX');
      return null;
    }
    
    try {
      const response = await CustomerService.create({
        customer_type: newCustomer.customer_type,
        name,
        company_name: newCustomer.company_name?.trim() || null,
        mobile,
        email: newCustomer.email?.trim() || null,
        address,
        city: newCustomer.city?.trim() || null,
        nic_id: newCustomer.nic_id?.trim() || null
      });
      
      if (response?.success && response.data) {
        toast.success('✅ Customer created');
        return response.data;
      } else {
        toast.error(response?.error || '❌ Failed to create customer');
        return null;
      }
    } catch (error) {
      console.error('Create customer error:', error);
      toast.error('❌ Network error');
      return null;
    }
  };

  const handleConfirm = async () => {
    if (customerType === 'existing') {
      if (!selectedCustomer || !selectedCustomer.id) {
        toast.error('❌ Please select a customer');
        return;
      }
      onConfirm({ customer: selectedCustomer, dueDate, notes: notes.trim() || null });
      onClose();
    } else {
      const newCust = await handleCreateCustomer();
      if (newCust) {
        onConfirm({ customer: newCust, dueDate, notes: notes.trim() || null });
        onClose();
      }
    }
  };

  const handleKeyDown = (e) => {
    // === SHORTCUT: Ctrl+Alt+E for Existing, Ctrl+Alt+N for New ===
    // Using Ctrl+Alt to avoid browser conflicts (Ctrl+N opens new tab)
    if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey) {
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setCustomerType('existing');
        setFocusedField('search');
        setTimeout(() => searchInputRef.current?.focus(), 10);
        toast.success('👤 Existing customer (Ctrl+Alt+E)');
        return;
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCustomerType('new');
        setFocusedField('customerType');
        toast.success('🆕 New customer form (Ctrl+Alt+N)');
        return;
      }
    }
    
    // === EXISTING CUSTOMER NAVIGATION ===
    if (customerType === 'existing') {
      if (showDropdown && filteredCustomers.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setDropdownIndex(prev => Math.min(prev + 1, filteredCustomers.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setDropdownIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && dropdownIndex >= 0) {
          e.preventDefault();
          const cust = filteredCustomers[dropdownIndex];
          if (cust?.id) {
            setSelectedCustomer(cust);
            setShowDropdown(false);
            setSearchCustomer(`${cust.name}${cust.company_name ? ` - ${cust.company_name}` : ''}`);
            setFocusedField('dueDate');
            setTimeout(() => dueDateInputRef.current?.focus(), 10);
            toast.success(`✓ Selected: ${cust.name}`);
          }
        }
      }
      
      if (focusedField === 'search' && e.key === 'Enter' && selectedCustomer) {
        e.preventDefault();
        setFocusedField('dueDate');
        setTimeout(() => dueDateInputRef.current?.focus(), 10);
      } else if (focusedField === 'dueDate' && e.key === 'Enter') {
        e.preventDefault();
        setFocusedField('notes');
        setTimeout(() => notesInputRef.current?.focus(), 10);
      } else if (focusedField === 'notes' && e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
      
      if (e.target === searchInputRef.current) {
        if (e.key === 'ArrowDown' && filteredCustomers.length > 0) {
          e.preventDefault();
          setShowDropdown(true);
          setDropdownIndex(0);
        }
      }
    }
    
    // === NEW CUSTOMER FORM NAVIGATION ===
    if (customerType === 'new') {
      const fieldOrder = ['customerType', 'name', 'mobile', 'email', 'address', 'city', 'dueDate', 'notes', 'create'];
      const currentIndex = fieldOrder.indexOf(focusedField);
      
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (focusedField === 'city' && !newCustomer.city?.trim()) {
          e.preventDefault();
          setFocusedField('dueDate');
          setTimeout(() => newCustomerRefs.current['dueDate']?.focus(), 10);
          return;
        }
        
        if (currentIndex < fieldOrder.length - 1) {
          e.preventDefault();
          const nextField = fieldOrder[currentIndex + 1];
          setFocusedField(nextField);
          
          if (nextField === 'create') {
            handleConfirm();
          } else if (nextField !== 'customerType') {
            setTimeout(() => newCustomerRefs.current[nextField]?.focus(), 10);
          }
        }
      }
      
      if (focusedField === 'customerType' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const types = ['individual', 'company'];
        const currentIdx = types.indexOf(newCustomer.customer_type);
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        const newIdx = (currentIdx + direction + types.length) % types.length;
        setNewCustomer({...newCustomer, customer_type: types[newIdx]});
      }
    }
    
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    
    if (customerType === 'existing') {
      if (focusedField === 'search') searchInputRef.current?.focus();
      else if (focusedField === 'dueDate') dueDateInputRef.current?.focus();
      else if (focusedField === 'notes') notesInputRef.current?.focus();
    } else {
      const field = focusedField;
      if (field && field !== 'create') {
        setTimeout(() => newCustomerRefs.current[field]?.focus(), 10);
      }
    }
  }, [focusedField, customerType, isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200 outline-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg">
              <FaUser />
            </div>
            <div>
              <h3 id="credit-modal-title" className="text-lg font-bold text-white">Credit Billing</h3>
              <p className="text-xs text-white/80">Ctrl+Alt+E=Existing, Ctrl+Alt+N=New • Enter to navigate • ESC to cancel</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Customer Type Toggle with Keyboard Hints */}
          <div className="flex gap-3">
            <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all ${
              customerType === 'existing'
                ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/10 ring-2 ring-purple-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                value="existing"
                checked={customerType === 'existing'}
                onChange={(e) => {
                  setCustomerType(e.target.value);
                  setSelectedCustomer(null);
                  setSearchCustomer('');
                  setShowDropdown(false);
                  setFocusedField('search');
                }}
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  customerType === 'existing' ? 'border-purple-500 bg-purple-500' : 'border-gray-400'
                }`}>
                  {customerType === 'existing' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                </div>
                <div>
                  <span className="font-bold text-gray-900">Existing Customer</span>
                  <p className="text-xs text-gray-500">Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Ctrl+Alt+E</kbd></p>
                </div>
              </div>
            </label>
            
            <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all ${
              customerType === 'new'
                ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/10 ring-2 ring-purple-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                value="new"
                checked={customerType === 'new'}
                onChange={(e) => {
                  setCustomerType(e.target.value);
                  setSelectedCustomer(null);
                  setFocusedField('customerType');
                }}
                className="sr-only"
              />
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  customerType === 'new' ? 'border-purple-500 bg-purple-500' : 'border-gray-400'
                }`}>
                  {customerType === 'new' && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                </div>
                <div>
                  <span className="font-bold text-gray-900">New Customer</span>
                  <p className="text-xs text-gray-500">Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Ctrl+Alt+N</kbd></p>
                </div>
              </div>
            </label>
          </div>

          {/* EXISTING CUSTOMER SECTION */}
          {customerType === 'existing' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border-2 transition-all ${focusedField === 'search' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  Search Customer <span className="text-red-500">*</span>
                  {focusedField === 'search' && <span className="text-xs text-purple-600 font-normal">← Type to search • ↓ to select</span>}
                </label>
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchCustomer}
                    onChange={(e) => {
                      setSearchCustomer(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => {
                      setFocusedField('search');
                      if (searchCustomer.length >= 1) setShowDropdown(true);
                    }}
                    placeholder="Start typing name, mobile, or company..."
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                      focusedField === 'search' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                    }`}
                    aria-label="Search existing customer"
                  />
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {showDropdown && searchCustomer.length >= 1 && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filteredCustomers.map((customer, index) => (
                      <button
                        key={customer?.id || index}
                        onClick={() => {
                          if (customer?.id) {
                            setSelectedCustomer(customer);
                            setShowDropdown(false);
                            setSearchCustomer(`${customer.name}${customer.company_name ? ` - ${customer.company_name}` : ''}`);
                            setFocusedField('dueDate');
                            setTimeout(() => dueDateInputRef.current?.focus(), 10);
                            toast.success(`✓ Selected: ${customer.name}`);
                          }
                        }}
                        className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 transition-all hover:bg-purple-50 ${
                          index === dropdownIndex ? 'bg-purple-100 border-l-4 border-l-purple-600' : ''
                        }`}
                        onMouseEnter={() => setDropdownIndex(index)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-bold text-sm ${index === dropdownIndex ? 'text-purple-700' : 'text-gray-900'}`}>
                              {customer?.name || 'N/A'}
                              {index === 0 && searchCustomer.length > 2 && (
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ Exact</span>
                              )}
                            </p>
                            {customer?.company_name && (
                              <p className="text-xs text-gray-600">{customer.company_name}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-0.5">📞 {customer?.mobile || 'N/A'}</p>
                          </div>
                          {(customer?.outstanding_balance || 0) > 0 && (
                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                              Outstanding: {formatLKR(customer.outstanding_balance)}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {searchCustomer.length >= 1 && filteredCustomers.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">No customers found. Try different search or create new.</p>
                )}
              </div>
              
              {selectedCustomer && (
                <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-purple-900">{selectedCustomer?.name || 'N/A'}</p>
                      {selectedCustomer?.company_name && (
                        <p className="text-sm text-purple-700">{selectedCustomer.company_name}</p>
                      )}
                      <p className="text-sm text-purple-600 mt-1">📞 {selectedCustomer?.mobile || 'N/A'}</p>
                      <p className="text-sm text-purple-600">📍 {selectedCustomer?.address || 'N/A'}{selectedCustomer?.city ? `, ${selectedCustomer.city}` : ''}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setSearchCustomer('');
                        setFocusedField('search');
                        searchInputRef.current?.focus();
                      }}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Change
                    </button>
                  </div>
                  {(selectedCustomer?.outstanding_balance || 0) > 0 && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-bold text-red-700">
                        ⚠️ Previous Outstanding: {formatLKR(selectedCustomer.outstanding_balance)}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className={`p-4 rounded-xl border-2 transition-all ${focusedField === 'dueDate' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  Due Date <span className="text-red-500">*</span>
                  {focusedField === 'dueDate' && <span className="text-xs text-purple-600 font-normal">← Active • Enter for Notes</span>}
                </label>
                <input
                  ref={dueDateInputRef}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onFocus={() => setFocusedField('dueDate')}
                  min={new Date().toISOString().slice(0, 10)}
                  className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium transition-all ${
                    focusedField === 'dueDate' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                  }`}
                  aria-label="Due date for credit bill"
                />
              </div>
              
              <div className={`p-4 rounded-xl border-2 transition-all ${focusedField === 'notes' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  Notes (Optional)
                  {focusedField === 'notes' && <span className="text-xs text-purple-600 font-normal">← Active • Enter to Create Bill</span>}
                </label>
                <textarea
                  ref={notesInputRef}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onFocus={() => setFocusedField('notes')}
                  className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    focusedField === 'notes' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                  }`}
                  rows={2}
                  placeholder="Additional notes about this credit bill..."
                  aria-label="Notes for credit bill"
                />
              </div>
            </div>
          )}

          {/* NEW CUSTOMER FORM */}
          {customerType === 'new' && (
            <div className="grid grid-cols-2 gap-4">
              <div className={`col-span-2 p-4 rounded-xl border-2 transition-all ${focusedField === 'customerType' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  Customer Type
                  {focusedField === 'customerType' && <span className="text-xs text-purple-600 font-normal">← ↑↓ to change • Enter for Name</span>}
                </label>
                <select
                  ref={el => newCustomerRefs.current['customerType'] = el}
                  value={newCustomer.customer_type}
                  onChange={(e) => setNewCustomer({...newCustomer, customer_type: e.target.value})}
                  onFocus={() => setFocusedField('customerType')}
                  className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    focusedField === 'customerType' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                  }`}
                  aria-label="Customer type selection"
                >
                  <option value="individual">👤 Individual</option>
                  <option value="company">🏢 Company</option>
                </select>
              </div>
              
              <div className={`col-span-2 p-4 rounded-xl border-2 transition-all ${focusedField === 'name' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  Full Name <span className="text-red-500">*</span>
                  {focusedField === 'name' && <span className="text-xs text-purple-600 font-normal">← Active • Enter for Mobile</span>}
                </label>
                <input
                  ref={el => newCustomerRefs.current['name'] = el}
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  onFocus={() => setFocusedField('name')}
                  className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    focusedField === 'name' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                  }`}
                  placeholder="Enter full name"
                  aria-label="Customer full name"
                />
              </div>
              
              {newCustomer.customer_type === 'company' && (
                <div className="col-span-2 p-4 rounded-xl border-2 border-gray-200 bg-gray-50">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Company Name</label>
                  <input
                    ref={el => newCustomerRefs.current['company_name'] = el}
                    type="text"
                    value={newCustomer.company_name}
                    onChange={(e) => setNewCustomer({...newCustomer, company_name: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter company name"
                  />
                </div>
              )}
              
              <div className={`p-4 rounded-xl border-2 transition-all ${focusedField === 'mobile' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  Mobile <span className="text-red-500">*</span>
                  {focusedField === 'mobile' && <span className="text-xs text-purple-600 font-normal">← Active • Enter for Email</span>}
                </label>
                <input
                  ref={el => newCustomerRefs.current['mobile'] = el}
                  type="tel"
                  value={newCustomer.mobile}
                  onChange={(e) => setNewCustomer({...newCustomer, mobile: e.target.value})}
                  onFocus={() => setFocusedField('mobile')}
                  className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    focusedField === 'mobile' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                  }`}
                  placeholder="07X XXX XXXX"
                  aria-label="Customer mobile number"
                />
              </div>
              
              <div className={`p-4 rounded-xl border-2 transition-all ${focusedField === 'email' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  Email (Optional)
                  {focusedField === 'email' && <span className="text-xs text-purple-600 font-normal">← Active • Enter for Address</span>}
                </label>
                <input
                  ref={el => newCustomerRefs.current['email'] = el}
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  onFocus={() => setFocusedField('email')}
                  className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    focusedField === 'email' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                  }`}
                  placeholder="email@example.com"
                  aria-label="Customer email"
                />
              </div>
              
              <div className={`col-span-2 p-4 rounded-xl border-2 transition-all ${focusedField === 'address' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  Address <span className="text-red-500">*</span>
                  {focusedField === 'address' && <span className="text-xs text-purple-600 font-normal">← Active • Enter for City</span>}
                </label>
                <textarea
                  ref={el => newCustomerRefs.current['address'] = el}
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  onFocus={() => setFocusedField('address')}
                  className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    focusedField === 'address' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                  }`}
                  rows={2}
                  placeholder="Street address, area"
                  aria-label="Customer address"
                />
              </div>
              
              <div className={`p-4 rounded-xl border-2 transition-all ${focusedField === 'city' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  City <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                  {focusedField === 'city' && <span className="text-xs text-purple-600 font-normal">← Active • Enter for Due Date</span>}
                </label>
                <input
                  ref={el => newCustomerRefs.current['city'] = el}
                  type="text"
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                  onFocus={() => setFocusedField('city')}
                  className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    focusedField === 'city' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                  }`}
                  placeholder="City (optional)"
                  aria-label="Customer city (optional)"
                />
                <p className="text-xs text-gray-400 mt-1">Press Enter to skip if not needed</p>
              </div>
              
              <div className={`p-4 rounded-xl border-2 transition-all ${focusedField === 'dueDate' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  Due Date <span className="text-red-500">*</span>
                  {focusedField === 'dueDate' && <span className="text-xs text-purple-600 font-normal">← Active • Enter for Notes</span>}
                </label>
                <input
                  ref={el => newCustomerRefs.current['dueDate'] = el}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onFocus={() => setFocusedField('dueDate')}
                  min={new Date().toISOString().slice(0, 10)}
                  className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium transition-all ${
                    focusedField === 'dueDate' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                  }`}
                  aria-label="Due date for credit bill"
                />
              </div>
              
              <div className={`col-span-2 p-4 rounded-xl border-2 transition-all ${focusedField === 'notes' ? 'border-purple-500 bg-purple-50/30 ring-2 ring-purple-200' : 'border-gray-200 bg-gray-50'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                  Notes (Optional)
                  {focusedField === 'notes' && <span className="text-xs text-purple-600 font-normal">← Active • Enter to Create Bill</span>}
                </label>
                <textarea
                  ref={el => newCustomerRefs.current['notes'] = el}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onFocus={() => setFocusedField('notes')}
                  className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                    focusedField === 'notes' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
                  }`}
                  rows={2}
                  placeholder="Additional notes about this credit bill..."
                  aria-label="Notes for credit bill"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-bold rounded-xl transition-all hover:bg-gray-100"
          >
            Cancel (ESC)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              (customerType === 'existing' && (!selectedCustomer || !selectedCustomer.id)) ||
              (customerType === 'new' && (!newCustomer.name?.trim() || !newCustomer.mobile?.trim() || !newCustomer.address?.trim())) ||
              !dueDate
            }
            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✓ Create Credit Bill (Enter)
          </button>
        </div>
      </div>
    </div>
  );
};

const CashBilling = () => {
  const { user } = useAuth();
  
  const [paymentMethod, setPaymentMethod] = useState(null);
  
  const [customerType, setCustomerType] = useState('existing');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchIndex, setCustomerSearchIndex] = useState(-1);
  
  const [newCustomer, setNewCustomer] = useState({
    customer_type: 'individual',
    name: '',
    company_name: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    nic_id: ''
  });
  
  const [dueDate, setDueDate] = useState('');
  const [creditNotes, setCreditNotes] = useState('');
  
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [processing, setProcessing] = useState(false);
  const [highlightRow, setHighlightRow] = useState(null);
  const [barcodeScannerMode, setBarcodeScannerMode] = useState(false);
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  
  const [selectedCartItemIndex, setSelectedCartItemIndex] = useState(-1);
  
  const searchInputRef = useRef(null);
  const cartContainerRef = useRef(null);
  const suggestionRefs = useRef([]);
  const customerSuggestionRefs = useRef([]);
  const cartItemRefs = useRef([]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    fetchCustomers();
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 30);
    setDueDate(defaultDue.toISOString().slice(0, 10));
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await CustomerService.getAll();
      if (response?.success && Array.isArray(response.data)) {
        setCustomers(response.data);
      }
    } catch (error) {
      console.error('Fetch customers error:', error);
      setCustomers([]);
    }
  };

  useEffect(() => {
    if (searchCustomer.length < 2 || customerType === 'new' || paymentMethod !== 'CREDIT') {
      setShowCustomerDropdown(false);
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        const response = await CustomerService.search(searchCustomer);
        if (response?.success && Array.isArray(response.data)) {
          setCustomers(response.data);
          setShowCustomerDropdown(true);
          setCustomerSearchIndex(response.data.length > 0 ? 0 : -1);
        } else {
          setCustomers([]);
          setShowCustomerDropdown(false);
        }
      } catch (error) {
        console.error('Search customers error:', error);
        setCustomers([]);
        setShowCustomerDropdown(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchCustomer, customerType, paymentMethod]);

  useEffect(() => {
    if (barcodeScannerMode) return;
    
    const timer = setTimeout(async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        return;
      }
      
      try {
        const response = await ProductService.getAll({ search: searchQuery });
        if (response?.success && Array.isArray(response.data)) {
          const filtered = response.data.filter(p => p.stock_quantity > 0).slice(0, 8);
          setSuggestions(filtered);
          setShowSuggestions(true);
          setSelectedSuggestionIndex(filtered.length > 0 ? 0 : -1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, barcodeScannerMode]);

  const totals = useMemo(() => {
    let totalAmount = 0;
    let totalDiscount = 0;
    
    if (!Array.isArray(cart)) return { totalAmount: 0, totalDiscount: 0, grandTotal: 0, itemCount: 0 };
    
    cart.forEach(item => {
      const itemTotal = (item.unit_price || 0) * (item.quantity || 0);
      const itemDiscount = (item.discount_lkr || 0) * (item.quantity || 0);
      totalAmount += itemTotal;
      totalDiscount += itemDiscount;
    });
    
    return {
      totalAmount,
      totalDiscount,
      grandTotal: Math.max(0, totalAmount - totalDiscount),
      itemCount: cart.reduce((sum, item) => sum + (item.quantity || 0), 0)
    };
  }, [cart]);
  
  const { totalAmount, totalDiscount, grandTotal, itemCount } = totals;

  // 🎯 GLOBAL KEYBOARD NAVIGATION - UPDATED WITH Ctrl+Alt SHORTCUTS
  useEffect(() => {
    const handleKeyDown = (e) => {
      // === PAYMENT METHOD SHORTCUTS: Ctrl+1=Cash, Ctrl+2=Card, Ctrl+3=Credit ===
      if (!showProductModal && !showCreditModal && !showSuggestions) {
        if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
          if (e.key === '1') {
            e.preventDefault();
            setPaymentMethod('CASH');
            setSelectedCustomer(null);
            toast.success('💵 Cash selected (Ctrl+1)');
            return;
          }
          if (e.key === '2') {
            e.preventDefault();
            setPaymentMethod('CARD');
            setSelectedCustomer(null);
            toast.success('💳 Card selected (Ctrl+2)');
            return;
          }
          if (e.key === '3') {
            e.preventDefault();
            setPaymentMethod('CREDIT');
            setSelectedCustomer(null);
            setSearchCustomer('');
            toast.success('📝 Credit selected (Ctrl+3)');
            return;
          }
        }
      }
      
      // === CART KEYBOARD NAVIGATION ===
      if (Array.isArray(cart) && cart.length > 0 && !showProductModal && !showCreditModal && !showSuggestions) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCartItemIndex(prev => {
            const next = prev < cart.length - 1 ? prev + 1 : prev;
            cartItemRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return next;
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCartItemIndex(prev => {
            const next = prev > 0 ? prev - 1 : prev;
            cartItemRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return next;
          });
        } else if (e.key === 'Backspace' && selectedCartItemIndex >= 0) {
          e.preventDefault();
          const item = cart[selectedCartItemIndex];
          if (item?.product_id && window.confirm(`🗑️ Remove "${item.product_name}" from cart?`)) {
            removeFromCart(item.product_id);
            setSelectedCartItemIndex(prev => Math.max(0, prev - 1));
            toast.success('✓ Item removed');
          }
        } else if (e.key === 'Delete' && selectedCartItemIndex >= 0) {
          e.preventDefault();
          const item = cart[selectedCartItemIndex];
          if (item?.product_id && window.confirm(`🗑️ Remove "${item.product_name}" from cart?`)) {
            removeFromCart(item.product_id);
            setSelectedCartItemIndex(prev => Math.max(0, prev - 1));
            toast.success('✓ Item removed');
          }
        }
      }
      
      // Global shortcuts
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        clearCart();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleCheckout();
      } else if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setShowCustomModal(true);
        setShowSuggestions(false);
      }
      
      // Customer dropdown navigation (credit only)
      if (paymentMethod === 'CREDIT' && showCustomerDropdown && Array.isArray(customers) && customers.length > 0 && customerType === 'existing') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCustomerSearchIndex(prev => {
            const next = prev < customers.length - 1 ? prev + 1 : prev;
            customerSuggestionRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return next;
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCustomerSearchIndex(prev => {
            const next = prev > 0 ? prev - 1 : prev;
            customerSuggestionRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return next;
          });
        } else if (e.key === 'Enter' && customerSearchIndex >= 0 && !showSuggestions && !showProductModal && !showCreditModal) {
          e.preventDefault();
          if (customers[customerSearchIndex]?.id) {
            const cust = customers[customerSearchIndex];
            setSelectedCustomer(cust);
            setShowCustomerDropdown(false);
            setSearchCustomer(`${cust.name}${cust.company_name ? ` - ${cust.company_name}` : ''}`);
            toast.success(`✓ Selected: ${cust.name}`);
          }
        }
      }
      
      // Product suggestions navigation
      if (showSuggestions && Array.isArray(suggestions) && suggestions.length > 0 && !showProductModal && !showCreditModal) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => {
            const next = prev < suggestions.length - 1 ? prev + 1 : prev;
            suggestionRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return next;
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedSuggestionIndex(prev => {
            const next = prev > 0 ? prev - 1 : prev;
            suggestionRefs.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            return next;
          });
        } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
          e.preventDefault();
          if (suggestions[selectedSuggestionIndex]) {
            handleProductSelect(suggestions[selectedSuggestionIndex]);
          }
        }
      }
      
      // ESC to close dropdowns/modals
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        setShowCustomerDropdown(false);
        setSelectedSuggestionIndex(-1);
        setCustomerSearchIndex(-1);
        setSelectedCartItemIndex(-1);
        if (showProductModal) {
          setShowProductModal(false);
          setPendingProduct(null);
        }
        if (showCreditModal) {
          setShowCreditModal(false);
        }
        if (!barcodeScannerMode) {
          setSearchQuery('');
        }
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showCustomerDropdown, showSuggestions, suggestions, customers, 
    selectedSuggestionIndex, customerSearchIndex, barcodeScannerMode, 
    cart, paymentMethod, showProductModal, showCreditModal, showCustomModal,
    selectedCartItemIndex
  ]);

  const handleProductSelect = useCallback((product) => {
    if (!product || !product.id) return;
    
    if ((product.stock_quantity || 0) <= 0) {
      toast.error(`❌ Out of stock: ${product.item_name}`);
      return;
    }
    
    setPendingProduct(product);
    setShowProductModal(true);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setSearchQuery('');
    
    if (!barcodeScannerMode) {
      searchInputRef.current?.focus();
    }
  }, [barcodeScannerMode]);

  const confirmAddCustomToCart = useCallback((customItemData) => {
    const uniqueId = `custom-${Date.now()}`;
    setCart(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return [...safePrev, {
        product_id: uniqueId,
        is_custom: true,
        product_name: customItemData.product_name,
        barcode: 'CUSTOM',
        short_form: 'Custom Item',
        unit_price: customItemData.unit_price,
        quantity: customItemData.quantity,
        max_stock: 999999,
        discount_mode: 'fixed',
        discount_value: customItemData.discount_lkr,
        discount_type: 'fixed',
        auto_discount_lkr: 0,
        discount_lkr: customItemData.discount_lkr
      }];
    });
    
    playScanSound();
    setHighlightRow(uniqueId);
    setTimeout(() => setHighlightRow(null), 800);
    
    toast.success(`✓ Added Custom: ${customItemData.product_name} × ${customItemData.quantity}`);
    setShowCustomModal(false);
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  const confirmAddToCart = useCallback((modalData) => {
    if (!pendingProduct || !pendingProduct.id) return;
    
    const product = pendingProduct;
    const { quantity, discountMode, discountValue, discountType, discountLKR } = modalData;
    
    setCart(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const existing = safePrev.find(item => item.product_id === product.id);
      
      if (existing) {
        const newQty = (existing.quantity || 0) + quantity;
        if (newQty > (product.stock_quantity || 0)) {
          toast.error(`⚠️ Max stock: ${product.stock_quantity}`);
          return prev;
        }
        return safePrev.map(item =>
          item.product_id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      
      return [...safePrev, {
        product_id: product.id,
        product_name: product.item_name || '',
        barcode: product.barcode || '',
        short_form: product.short_form || '',
        unit_price: product.selling_price || 0,
        quantity: quantity,
        max_stock: product.stock_quantity || 0,
        discount_mode: discountMode,
        discount_value: discountValue,
        discount_type: discountType,
        auto_discount_lkr: discountMode === 'default' 
          ? (product.discount_type === 'percent'
              ? (product.selling_price || 0) * (product.discount_value || 0) / 100
              : (product.discount_value || 0))
          : 0,
        discount_lkr: discountLKR
      }];
    });
    
    playScanSound();
    setHighlightRow(product.id);
    setTimeout(() => setHighlightRow(null), 800);
    
    toast.success(`✓ Added: ${product.item_name} × ${quantity}`);
    setPendingProduct(null);
    setShowProductModal(false);
    
    if (!barcodeScannerMode) {
      searchInputRef.current?.focus();
    }
  }, [pendingProduct, barcodeScannerMode]);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    if (barcodeScannerMode) {
      try {
        const response = await ProductService.getAll({ search: searchQuery.trim() });
        if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
          const exactMatch = response.data.find(p => p.barcode === searchQuery.trim());
          if (exactMatch) {
            handleProductSelect(exactMatch);
            setSearchQuery('');
            return;
          }
        }
        toast.error('❌ Product not found');
        setSearchQuery('');
      } catch (error) {
        console.error('Barcode lookup error:', error);
        setSearchQuery('');
      }
      return;
    }
    
    try {
      const response = await ProductService.getAll({ search: searchQuery.trim() });
      if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
        const exactMatch = response.data.find(p => p.barcode === searchQuery.trim());
        if (exactMatch) {
          handleProductSelect(exactMatch);
          return;
        }
      }
    } catch (error) {
      console.error('Lookup error:', error);
    }
    
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      const index = selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length 
        ? selectedSuggestionIndex 
        : 0;
      if (suggestions[index]) {
        handleProductSelect(suggestions[index]);
      }
    } else {
      setShowCustomModal(true);
      setShowSuggestions(false);
    }
  };

  const handleSearchChange = (e) => {
    if (barcodeScannerMode) {
      const value = e.target.value;
      setSearchQuery(value);
      if (value.endsWith('\n')) {
        setSearchQuery(value.replace(/\n$/, ''));
        handleSearchSubmit(e);
      }
    } else {
      setSearchQuery(e.target.value);
    }
  };

  const updateCartItem = (productId, field, value) => {
    setCart(prev => {
      if (!Array.isArray(prev)) return prev;
      return prev.map(item => {
        if (item.product_id !== productId) return item;
        
        let updated = { ...item };
        
        if (field === 'quantity') {
          const qty = parseInt(value) || 0;
          if (qty <= 0) {
            toast.error('⚠️ Quantity must be at least 1');
            return item;
          }
          if (qty > (item.max_stock || 0)) {
            toast.error(`⚠️ Max stock: ${item.max_stock}`);
            return item;
          }
          updated.quantity = qty;
        } else if (field === 'discount_mode') {
          updated.discount_mode = value;
          if (value === 'default') {
            updated.discount_lkr = item.auto_discount_lkr || 0;
            updated.discount_value = item.discount_value || 0;
            updated.discount_type = item.discount_type || 'fixed';
          } else if (value === 'percent') {
            updated.discount_value = 0;
            updated.discount_lkr = 0;
            updated.discount_type = 'percent';
          } else if (value === 'fixed') {
            updated.discount_value = 0;
            updated.discount_lkr = 0;
            updated.discount_type = 'fixed';
          }
        } else if (field === 'discount_value') {
          const val = parseFloat(value) || 0;
          if (val < 0) {
            toast.error('⚠️ Discount cannot be negative');
            return item;
          }
          
          updated.discount_value = val;
          
          if (updated.discount_mode === 'percent') {
            if (val > 100) {
              toast.error('⚠️ Discount cannot exceed 100%');
              updated.discount_value = 100;
              updated.discount_lkr = item.unit_price || 0;
            } else {
              updated.discount_lkr = (item.unit_price || 0) * val / 100;
            }
          } else if (updated.discount_mode === 'fixed') {
            if (val > (item.unit_price || 0)) {
              toast.error('⚠️ Discount cannot exceed unit price');
              updated.discount_value = item.unit_price || 0;
              updated.discount_lkr = item.unit_price || 0;
            } else {
              updated.discount_lkr = val;
            }
          }
        }
        
        return updated;
      });
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => Array.isArray(prev) ? prev.filter(item => item.product_id !== productId) : []);
  };

  const clearCart = () => {
    if (!Array.isArray(cart) || cart.length === 0) return;
    if (window.confirm('🗑️ Clear all items from cart?')) {
      setCart([]);
      setPaymentMethod(null);
      setSelectedCustomer(null);
      setSelectedCartItemIndex(-1);
      toast.success('Cart cleared');
    }
  };

  const handleCreateCustomer = async () => {
    const name = newCustomer.name?.trim();
    const mobile = newCustomer.mobile?.trim();
    const address = newCustomer.address?.trim();
    
    if (!name || !mobile || !address) {
      toast.error('❌ Please fill required fields: Name, Mobile, Address');
      return null;
    }
    
    if (!/^07[01245678]\d{7}$/.test(mobile)) {
      toast.error('❌ Invalid mobile format. Use: 07X XXX XXXX');
      return null;
    }
    
    try {
      const response = await CustomerService.create({
        customer_type: newCustomer.customer_type || 'individual',
        name,
        company_name: newCustomer.company_name?.trim() || null,
        mobile,
        email: newCustomer.email?.trim() || null,
        address,
        city: newCustomer.city?.trim() || null,
        nic_id: newCustomer.nic_id?.trim() || null
      });
      
      if (response?.success && response.data) {
        toast.success('✅ Customer created successfully');
        fetchCustomers();
        return response.data;
      } else {
        toast.error(response?.error || '❌ Failed to create customer');
        return null;
      }
    } catch (error) {
      console.error('Create customer error:', error);
      toast.error('❌ Network error creating customer');
      return null;
    }
  };
 
  const openCashReceiptPrint = (billData, cartItems, paymentMethod) => {
  const printWindow = window.open('', '_blank', 'width=400,height=700');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${billData.billNumber}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        * { box-sizing: border-box; }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          font-size: 11px; 
          line-height: 1.4;
          margin: 0; 
          padding: 2mm; 
          background: #fff; 
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .receipt-container {
          width: 100%;
          max-width: 80mm;
          margin: 0 auto;
        }
        .header { 
          text-align: center; 
          margin-bottom: 8px; 
          border-bottom: 2px dashed #000; 
          padding-bottom: 8px; 
        }
        .header h2 { 
          margin: 0 0 4px 0; 
          font-size: 16px; 
          font-weight: bold; 
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .header .company-info {
          font-size: 10px;
          margin: 2px 0;
          line-height: 1.5;
        }
        .header .bill-type {
          font-size: 11px;
          font-weight: bold;
          margin-top: 4px;
          text-transform: uppercase;
        }
        .date-time {
          text-align: right;
          font-size: 9px;
          margin-top: 4px;
        }
        .bill-info { 
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 6px; 
          font-size: 10px; 
          border-bottom: 1px solid #000; 
          padding-bottom: 4px; 
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 8px; 
        }
        th { 
          text-align: left; 
          border-bottom: 2px solid #000; 
          padding: 3px 2px; 
          font-size: 10px; 
          font-weight: bold; 
        }
        td { 
          padding: 3px 2px; 
          font-size: 10px; 
          vertical-align: top; 
          color: #000;
        }
        .barcode-sub {
          font-size: 8px;
          color: #000;
          opacity: 0.75;
        }
        .totals { 
          border-top: 2px dashed #000; 
          padding-top: 6px; 
          margin-top: 4px; 
        }
        .totals .row { 
          display: flex; 
          justify-content: space-between; 
          margin: 2px 0; 
          font-size: 11px; 
        }
        .totals .disc-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
          font-size: 11px;
        }
        .grand-total { 
          font-weight: bold; 
          font-size: 14px; 
          border-top: 2px solid #000; 
          border-bottom: 2px solid #000;
          padding: 4px 0; 
          margin: 4px 0; 
          display: flex;
          justify-content: space-between;
        }
        .payment-info { 
          text-align: center; 
          margin: 8px 0; 
          padding: 5px 4px; 
          font-weight: bold; 
          border: 2px solid #000;
          font-size: 11px;
          letter-spacing: 0.5px;
        }
        .footer { 
          text-align: center; 
          margin-top: 10px; 
          font-size: 9px; 
          border-top: 2px dashed #000; 
          padding-top: 6px; 
          line-height: 1.6;
        }
        .audit { 
          font-size: 8px; 
          color: #000;
          margin-top: 8px; 
          text-align: center; 
          border-top: 1px dashed #000;
          padding-top: 4px;
        }
        @media print { 
          * { color: #000 !important; background: transparent !important; }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .receipt-container {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h2>SAMAGI MOTORS</h2>
          <div class="company-info">
            <div>TP: 077 779 7410</div>
            <div>Madagalle Road, Kubukgate</div>
            <div>(Kurunegala)</div>
          </div>
          <div class="bill-type">${paymentMethod} BILL</div>
          <div class="date-time">${new Date().toLocaleString('en-LK')}</div>
        </div>
        <div class="bill-info">
          <span>Bill #: ${billData.billNumber}</span>
          <span>Cashier: ${billData.cashier}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:42%">Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:right">Disc</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${Array.isArray(cartItems) ? cartItems.map(item => `
              <tr>
                <td>${item.product_name}<br><span class="barcode-sub">${item.barcode || ''}</span></td>
                <td style="text-align:center">${item.quantity}</td>
                <td style="text-align:right">${(item.unit_price || 0).toFixed(2)}</td>
                <td style="text-align:right">${(item.discount_lkr || 0) > 0 ? '-' + ((item.discount_lkr * item.quantity) || 0).toFixed(2) : '-'}</td>
                <td style="text-align:right;font-weight:bold">${(((item.unit_price || 0) * (item.quantity || 1)) - ((item.discount_lkr || 0) * (item.quantity || 1))).toFixed(2)}</td>
              </tr>
            `).join('') : ''}
          </tbody>
        </table>
        <div class="totals">
          <div class="row"><span>Subtotal:</span><span>LKR ${totalAmount.toFixed(2)}</span></div>
          <div class="disc-row"><span>Discount:</span><span>- LKR ${totalDiscount.toFixed(2)}</span></div>
          <div class="grand-total"><span>TOTAL:</span><span>LKR ${grandTotal.toFixed(2)}</span></div>
          <div class="payment-info">PAYMENT: ${paymentMethod}</div>
        </div>
        <div class="footer">
          <p>Thank you for shopping with us!</p>
          <p>Goods once sold cannot be returned</p>
          <p>TP: 077 779 7410 | Madagalle Road, Kubukgate</p>
        </div>
        <div class="audit">
          Audit: ${billData.billNumber} | ${new Date().toISOString()} | Cashier: ${billData.cashier}
        </div>
      </div>
      <script>
        window.onload = () => { setTimeout(() => window.print(), 300); };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

const openCreditReceiptPrint = (billData, cartItems, customer) => {
  const printWindow = window.open('', '_blank', 'width=400,height=800');
  const safeOutstanding = customer?.outstanding_balance || 0;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Credit Bill - ${billData.billNumber}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        * { box-sizing: border-box; }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          font-size: 11px;
          line-height: 1.4;
          margin: 0; 
          padding: 2mm; 
          background: #fff; 
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .receipt-container {
          width: 100%;
          max-width: 80mm;
          margin: 0 auto;
        }
        .header { 
          text-align: center; 
          margin-bottom: 8px; 
          border-bottom: 2px dashed #000; 
          padding-bottom: 8px; 
        }
        .header h2 { 
          margin: 0 0 4px 0; 
          font-size: 16px; 
          font-weight: bold; 
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .header .company-info {
          font-size: 10px;
          margin: 2px 0;
          line-height: 1.5;
        }
        .header .bill-type {
          font-size: 11px;
          font-weight: bold;
          margin-top: 4px;
        }
        .date-time {
          text-align: right;
          font-size: 9px;
          margin-top: 4px;
        }
        .customer-info { 
          margin-bottom: 8px; 
          font-size: 10px; 
          border-bottom: 1px solid #000; 
          padding-bottom: 6px; 
        }
        .customer-info div { 
          margin: 2px 0; 
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 8px; 
        }
        th { 
          text-align: left; 
          border-bottom: 2px solid #000; 
          padding: 3px 2px; 
          font-size: 10px; 
          font-weight: bold; 
        }
        td { 
          padding: 3px 2px; 
          font-size: 10px;
          color: #000;
        }
        .barcode-sub {
          font-size: 8px;
          color: #000;
          opacity: 0.75;
        }
        .totals { 
          border-top: 2px dashed #000; 
          padding-top: 6px; 
          margin-top: 4px; 
        }
        .totals .row { 
          display: flex; 
          justify-content: space-between; 
          margin: 2px 0; 
          font-size: 11px; 
        }
        .grand-total { 
          font-weight: bold; 
          font-size: 14px; 
          border-top: 2px solid #000; 
          border-bottom: 2px solid #000;
          padding: 4px 0; 
          margin: 4px 0;
          display: flex;
          justify-content: space-between;
        }
        .outstanding { 
          border: 2px solid #000;
          padding: 6px; 
          margin-top: 6px; 
          text-align: center; 
          font-weight: bold; 
          font-size: 12px;
        }
        .credit-label {
          font-weight: bold;
          font-size: 10px;
          border: 1px solid #000;
          padding: 1px 6px;
        }
        .footer { 
          text-align: center; 
          margin-top: 10px; 
          font-size: 9px; 
          border-top: 2px dashed #000; 
          padding-top: 6px;
          line-height: 1.6;
        }
        @media print { 
          * { color: #000 !important; background: transparent !important; }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .receipt-container {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h2>SAMAGI MOTORS</h2>
          <div class="company-info">
            <div>TP: 077 779 7410</div>
            <div>Madagalle Road, Kubukgate</div>
            <div>(Kurunegala)</div>
          </div>
          <div class="bill-type">[ <span class="credit-label">CREDIT BILL</span> ]</div>
          <div class="date-time">${new Date().toLocaleString('en-LK')}</div>
        </div>
        <div class="customer-info">
          <div><strong>Bill #:</strong> ${billData.billNumber}</div>
          <div><strong>Customer:</strong> ${customer?.name || 'N/A'}${customer?.company_name ? ` (${customer.company_name})` : ''}</div>
          <div><strong>Mobile:</strong> ${customer?.mobile || 'N/A'}</div>
          <div><strong>Address:</strong> ${customer?.address || 'N/A'}${customer?.city ? `, ${customer.city}` : ''}</div>
          <div><strong>Due Date:</strong> ${billData.due_date ? new Date(billData.due_date).toLocaleDateString('en-LK') : 'N/A'}</div>
          ${safeOutstanding > 0 ? `<div><strong>Prev. Outstanding:</strong> LKR ${safeOutstanding.toFixed(2)}</div>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:40%">Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:right">Disc</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${Array.isArray(cartItems) ? cartItems.map(item => `
              <tr>
                <td>${item.product_name || 'N/A'}<br><span class="barcode-sub">${item.barcode || ''}</span></td>
                <td style="text-align:center">${item.quantity || 1}</td>
                <td style="text-align:right">${(item.unit_price || 0).toFixed(2)}</td>
                <td style="text-align:right">${(item.discount_lkr || 0) > 0 ? '-' + ((item.discount_lkr * item.quantity) || 0).toFixed(2) : '-'}</td>
                <td style="text-align:right;font-weight:bold">${(((item.unit_price || 0) * (item.quantity || 1)) - ((item.discount_lkr || 0) * (item.quantity || 1))).toFixed(2)}</td>
              </tr>
            `).join('') : ''}
          </tbody>
        </table>
        <div class="totals">
          <div class="row"><span>Subtotal:</span><span>LKR ${totalAmount.toFixed(2)}</span></div>
          <div class="row"><span>Discount:</span><span>- LKR ${totalDiscount.toFixed(2)}</span></div>
          <div class="grand-total"><span>TOTAL:</span><span>LKR ${grandTotal.toFixed(2)}</span></div>
        </div>
        <div class="outstanding">
          NEW OUTSTANDING: LKR ${(safeOutstanding + grandTotal).toFixed(2)}
        </div>
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Please settle the bill by the due date</p>
          <p>Cashier: ${billData.cashier || 'N/A'}</p>
    </body>
    </html>
  `);
  printWindow.document.close();
};

  const handleCheckout = async () => {
    if (!Array.isArray(cart) || cart.length === 0) {
      toast.error('❌ Cart is empty');
      return;
    }
    if (!paymentMethod) {
      toast.error('❌ Please select payment method (Ctrl+1=Cash, Ctrl+2=Card, Ctrl+3=Credit)');
      return;
    }
    if (grandTotal <= 0) {
      toast.error('❌ Invalid bill total');
      return;
    }
    
    if (paymentMethod === 'CREDIT') {
      setShowCreditModal(true);
      return;
    }
    
    await processCheckout();
  };

  const processCheckout = async (creditData = null) => {
    setProcessing(true);
    
    try {
      const billItems = cart.map(item => ({
        product_id: item.is_custom ? null : item.product_id,
        is_custom: item.is_custom || false,
        product_name: item.product_name,
        barcode: item.barcode || 'CUSTOM',
        unit_price: parseFloat(item.unit_price) || 0,
        quantity: parseInt(item.quantity) || 1,
        discount_lkr: parseFloat(item.discount_lkr) || 0
      }));
      
      let response;
      
      if (paymentMethod === 'CREDIT' && creditData) {
        const customer = creditData.customer;
        response = await CreditBillService.create({
          customer_id: customer.id,
          customer_name: customer.name,
          customer_mobile: customer.mobile,
          items: billItems,
          due_date: creditData.dueDate,
          notes: creditData.notes
        });
        
        if (response?.success && response.data) {
          toast.success(`✅ Credit Bill #${response.data.billNumber} saved!`);
          openCreditReceiptPrint(response.data, cart, customer);
        }
      } else {
        response = await BillService.create(billItems, paymentMethod);
        
        if (response?.success) {
          toast.success(`✅ Bill #${response.data.billNumber} saved!`);
          openCashReceiptPrint(response.data, cart, paymentMethod);
        }
      }
      
      if (response?.success) {
        setCart([]);
        setPaymentMethod(null);
        setSelectedCustomer(null);
        setCustomerType('existing');
        setSearchQuery('');
        setSearchCustomer('');
        setCreditNotes('');
        setSelectedCartItemIndex(-1);
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);
        setDueDate(defaultDue.toISOString().slice(0, 10));
        searchInputRef.current?.focus();
      } else {
        toast.error(response?.error || '❌ Billing failed');
      }
      
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.message || '❌ Billing failed - please try again');
    } finally {
      setProcessing(false);
    }
  };

  const formatLKR = (amount) => `LKR ${(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <ProductConfirmationModal 
        product={pendingProduct}
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setPendingProduct(null);
          searchInputRef.current?.focus();
        }}
        onConfirm={confirmAddToCart}
        formatLKR={formatLKR}
      />
      
      <CustomItemConfirmationModal
        isOpen={showCustomModal}
        onClose={() => {
          setShowCustomModal(false);
          searchInputRef.current?.focus();
        }}
        onConfirm={confirmAddCustomToCart}
        initialName={searchQuery}
      />
      
      <CreditCustomerModal
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onConfirm={processCheckout}
        customers={customers}
        formatLKR={formatLKR}
      />
      
      <main className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-lg shadow-lg">
                <FaMoneyBillWave />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cash Billing</h1>
                <p className="text-sm text-gray-500">Ctrl+1/2/3 for payment • Ctrl+Alt+E/N for credit</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0)?.toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          
          <div className="lg:col-span-2 flex flex-col gap-4">
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 relative">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={barcodeScannerMode}
                      onChange={(e) => {
                        setBarcodeScannerMode(e.target.checked);
                        setSearchQuery('');
                        setShowSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                        if (e.target.checked) {
                          searchInputRef.current?.focus();
                          toast.success('📷 Barcode Scanner Mode Activated');
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-primary-700 transition-colors flex items-center gap-1.5">
                      <FaBarcode className="text-primary-600" /> Barcode Scanner Mode
                    </span>
                    <span className="text-xs text-gray-500">
                      {barcodeScannerMode ? 'Auto-add on scan • Manual typing disabled' : 'Type to search products'}
                    </span>
                  </div>
                </label>
                
                {barcodeScannerMode && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-green-700">Ready to Scan</span>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder={barcodeScannerMode ? "Scan barcode now..." : "Search by name, barcode, or short form..."}
                      readOnly={barcodeScannerMode}
                      className={`w-full pl-12 pr-24 py-4 text-lg bg-gray-50 border-2 rounded-xl focus:outline-none transition-all ${
                        barcodeScannerMode
                          ? 'border-green-300 bg-green-50/30 cursor-not-allowed'
                          : 'border-gray-200 focus:border-primary-500 focus:bg-white'
                      }`}
                      autoComplete="off"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      {barcodeScannerMode ? (
                        <svg className="w-6 h-6 text-green-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <kbd className="hidden sm:inline-block px-2 py-1 bg-gray-200 rounded text-xs font-mono font-semibold text-gray-600">
                        ESC
                      </kbd>
                    </div>
                  </div>
                  
                  {!barcodeScannerMode && (
                    <button
                      type="submit"
                      disabled={!searchQuery.trim()}
                      className="px-6 py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                    >
                      Search
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomModal(true);
                      setShowSuggestions(false);
                    }}
                    className="px-5 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
                    title="Add Custom Item (Alt+C)"
                  >
                    <FaPlus className="w-4 h-4" />
                    <span>Add Custom Item</span>
                    <kbd className="hidden lg:inline-block px-1.5 py-0.5 bg-amber-600 text-white text-xs rounded font-mono font-semibold">Alt+C</kbd>
                  </button>
                </div>
              </form>
              
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono">Enter</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300 font-mono font-bold">Alt+C</kbd>
                  Custom Item
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono">ESC</kbd>
                  Cancel
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-gray-100 rounded border font-mono">Ctrl+1/2/3</kbd>
                  Payment
                </span>
              </div>
              
              {showSuggestions && searchQuery.trim().length >= 2 && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                  {suggestions.map((product, index) => (
                    <button
                      key={product?.id || index}
                      ref={el => suggestionRefs.current[index] = el}
                      onClick={() => product && handleProductSelect(product)}
                      className={`w-full text-left px-5 py-4 border-b border-gray-100 last:border-0 flex justify-between items-center transition-all group ${
                        index === selectedSuggestionIndex
                          ? 'bg-primary-100 border-l-4 border-l-primary-600'
                          : 'hover:bg-primary-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${index === selectedSuggestionIndex ? 'text-primary-700' : 'text-gray-900 group-hover:text-primary-700'}`}>
                            {product.item_name || 'N/A'}
                          </p>
                          {(product.discount_value || 0) > 0 && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              -{product.discount_value}{product.discount_type === 'percent' ? '%' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{product.barcode || ''}</span>
                          {product.short_form && <span className="ml-2">• {product.short_form}</span>}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-primary-700 text-lg">{formatLKR(product.selling_price)}</p>
                        <p className="text-xs text-gray-500">Stock: <span className={(product.stock_quantity || 0) <= 10 ? 'text-red-600 font-medium' : 'text-green-600'}>{product.stock_quantity || 0}</span></p>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomModal(true);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-5 py-4 bg-primary-50/50 hover:bg-primary-100 flex items-center justify-between transition-all font-semibold text-primary-700 border-t border-gray-100"
                  >
                    <span className="flex items-center gap-2">
                      <FaPlus /> Add Custom Item: "{searchQuery}"
                    </span>
                    <kbd className="px-2 py-0.5 bg-primary-200 text-primary-800 text-xs rounded font-mono font-bold">Alt+C</kbd>
                  </button>
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col max-h-[420px]">
              <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm">
                    {itemCount}
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">Cart Items</h3>
                </div>
                <button 
                  onClick={clearCart} 
                  disabled={!Array.isArray(cart) || cart.length === 0}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All (F4)
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[350px] min-h-[160px]" ref={cartContainerRef}>
                {!Array.isArray(cart) || cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <FaShoppingCart className="w-12 h-12 opacity-30 mb-2" />
                    <p className="text-base font-semibold text-gray-600">Cart is empty</p>
                    <p className="text-xs mt-1 text-gray-500">
                      {barcodeScannerMode ? 'Scan a barcode to add items' : 'Search products or scan barcode to add items'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2">Tip: Press Ctrl+1/2/3 to select payment method</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-5 py-2.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Qty</th>
                        <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Unit Price</th>
                        <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-36">Discount</th>
                        <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Subtotal</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {cart.map((item, index) => (
                        <tr 
                          key={item?.product_id || index}
                          ref={el => cartItemRefs.current[index] = el}
                          className={`transition-all duration-200 cursor-pointer ${
                            selectedCartItemIndex === index
                              ? 'bg-primary-100 ring-2 ring-primary-500 shadow-md'
                              : highlightRow === item?.product_id 
                                ? 'bg-primary-50 ring-2 ring-primary-500/30' 
                                : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          } hover:bg-blue-50/50`}
                          onClick={() => setSelectedCartItemIndex(index)}
                          onMouseEnter={() => setSelectedCartItemIndex(index)}
                        >
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0 shadow-sm">
                                {(item?.product_name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{item?.product_name || 'N/A'}</p>
                                <p className="text-[11px] text-gray-500 font-mono bg-gray-100 inline-block px-1 rounded">{item?.barcode || ''}</p>
                                {item?.short_form && (
                                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                    {item.short_form}
                                  </span>
                                )}
                                {(item?.discount_lkr || 0) > 0 && (
                                  <div className="mt-0.5 text-[10px] font-semibold text-green-700">
                                    Auto: {formatLKR(item.discount_lkr)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <input
                                type="number"
                                min="1"
                                max={item?.max_stock || 999}
                                value={item?.quantity || 1}
                                onChange={(e) => updateCartItem(item?.product_id, 'quantity', e.target.value)}
                                className="w-16 text-center border border-gray-300 rounded-lg py-1 font-bold text-sm text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none"
                              />
                              <p className="text-[10px] text-gray-400">Max: {item?.max_stock || 0}</p>
                            </div>
                          </td>
                          
                          <td className="px-3 py-2.5 text-right font-bold text-sm text-gray-900">
                            {formatLKR(item?.unit_price)}
                          </td>
                          
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <select
                                value={item?.discount_mode || 'default'}
                                onChange={(e) => updateCartItem(item?.product_id, 'discount_mode', e.target.value)}
                                className="w-full text-xs border border-gray-300 rounded-lg py-1 px-1 bg-white focus:ring-2 focus:ring-primary-500 font-medium"
                              >
                                <option value="default">Auto</option>
                                <option value="percent">Manual %</option>
                                <option value="fixed">Manual LKR</option>
                              </select>
                              
                              <div className="relative w-full">
                                <input
                                  type="number"
                                  min="0"
                                  step={(item?.discount_mode === 'percent') ? "1" : "0.01"}
                                  max={(item?.discount_mode === 'percent') ? "100" : (item?.unit_price || 0)}
                                  value={item?.discount_value || 0}
                                  onChange={(e) => updateCartItem(item?.product_id, 'discount_value', e.target.value)}
                                  disabled={(item?.discount_mode || 'default') === 'default'}
                                  className={`w-full text-right border-2 rounded-lg py-2 font-medium transition-all pl-8 ${
                                    (item?.discount_mode || 'default') === 'default'
                                      ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                                      : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                                  }`}
                                  placeholder={(item?.discount_mode === 'percent') ? '0%' : '0.00'}
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                  {(item?.discount_mode === 'percent') ? '%' : 'Rs'}
                                </span>
                              </div>
                              
                              {(item?.discount_lkr || 0) > 0 && (
                                <p className="text-[10px] text-green-600 font-bold">
                                  Saved: {formatLKR((item.discount_lkr || 0) * (item.quantity || 1))}
                                </p>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-4 py-4 text-right font-black text-primary-700 text-xl">
                            {formatLKR(((item?.unit_price || 0) * (item?.quantity || 1)) - ((item?.discount_lkr || 0) * (item?.quantity || 1)))}
                          </td>
                          
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => item?.product_id && removeFromCart(item.product_id)}
                              className="p-2.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all hover:shadow-md"
                              title="Remove Item (Backspace)"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              {cart.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-4">
                  <span>⌨️ <kbd className="px-1.5 py-0.5 bg-gray-200 rounded font-mono">↑↓</kbd> Navigate items</span>
                  <span><kbd className="px-1.5 py-0.5 bg-gray-200 rounded font-mono">Backspace</kbd> Remove selected</span>
                  <span><kbd className="px-1.5 py-0.5 bg-gray-200 rounded font-mono">Ctrl+1/2/3</kbd> Select payment</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-6">
              
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-lg">
                  📊
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Bill Summary</h3>
                  <p className="text-xs text-gray-500">{itemCount} items in cart</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-gray-600 p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium">Subtotal</span>
                  <span className="font-bold text-lg">{formatLKR(totalAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center text-green-600 p-3 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-sm font-medium">Total Discount</span>
                  <span className="font-bold text-lg">- {formatLKR(totalDiscount)}</span>
                </div>
                
                {totalDiscount > 0 && (
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl text-center shadow-lg">
                    <p className="text-sm font-semibold">
                      🎉 Customer Saved: <strong>{formatLKR(totalDiscount)}</strong>
                    </p>
                  </div>
                )}
                
                <div className="border-t-2 border-gray-200 pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Grand Total</span>
                  <span className="text-4xl font-black text-primary-700">{formatLKR(grandTotal)}</span>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setPaymentMethod('CASH');
                      setSelectedCustomer(null);
                      toast.success('💵 Cash selected (Ctrl+1)');
                    }}
                    className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'CASH'
                        ? 'border-green-500 bg-green-50 shadow-lg shadow-green-500/20'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="absolute top-2 left-2 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold">Ctrl+1</span>
                    <span className="text-3xl">💵</span>
                    <span className={`font-bold text-sm ${paymentMethod === 'CASH' ? 'text-green-700' : 'text-gray-700'}`}>
                      CASH
                    </span>
                    {paymentMethod === 'CASH' && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setPaymentMethod('CARD');
                      setSelectedCustomer(null);
                      toast.success('💳 Card selected (Ctrl+2)');
                    }}
                    className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'CARD'
                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="absolute top-2 left-2 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold">Ctrl+2</span>
                    <span className="text-3xl">💳</span>
                    <span className={`font-bold text-sm ${paymentMethod === 'CARD' ? 'text-blue-700' : 'text-gray-700'}`}>
                      CARD
                    </span>
                    {paymentMethod === 'CARD' && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setPaymentMethod('CREDIT');
                      setSelectedCustomer(null);
                      setSearchCustomer('');
                      toast.success('📝 Credit selected (Ctrl+3)');
                    }}
                    className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'CREDIT'
                        ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/20'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="absolute top-2 left-2 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-bold">Ctrl+3</span>
                    <span className="text-3xl">📝</span>
                    <span className={`font-bold text-sm ${paymentMethod === 'CREDIT' ? 'text-purple-700' : 'text-gray-700'}`}>
                      CREDIT
                    </span>
                    {paymentMethod === 'CREDIT' && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
                
                {!paymentMethod && (
                  <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Press <kbd className="px-1 py-0.5 bg-amber-100 rounded font-mono">Ctrl+1</kbd>/<kbd className="px-1 py-0.5 bg-amber-100 rounded font-mono">2</kbd>/<kbd className="px-1 py-0.5 bg-amber-100 rounded font-mono">3</kbd> to select</span>
                  </p>
                )}
              </div>
              
              {paymentMethod === 'CREDIT' && (
                <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl">
                  <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <span>👤</span>
                    Customer Required
                  </h4>
                  <p className="text-sm text-gray-600">
                    Press <kbd className="px-1.5 py-0.5 bg-purple-100 rounded font-mono">F9</kbd> or click below. Use <kbd className="px-1.5 py-0.5 bg-purple-100 rounded font-mono">Ctrl+Alt+E</kbd> for Existing or <kbd className="px-1.5 py-0.5 bg-purple-100 rounded font-mono">Ctrl+Alt+N</kbd> for New customer.
                  </p>
                  {selectedCustomer && (
                    <div className="mt-3 p-3 bg-purple-100 border border-purple-200 rounded-lg">
                      <p className="font-bold text-purple-900 text-sm">{selectedCustomer?.name}</p>
                      <p className="text-xs text-purple-700">📞 {selectedCustomer?.mobile}</p>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={handleCheckout}
                disabled={
                  processing || 
                  !Array.isArray(cart) || cart.length === 0 || 
                  grandTotal <= 0 || 
                  !paymentMethod
                }
                className={`w-full py-4 font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 mb-4 ${
                  processing || 
                  !Array.isArray(cart) || cart.length === 0 || 
                  grandTotal <= 0 || 
                  !paymentMethod
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : paymentMethod === 'CREDIT'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white hover:shadow-xl hover:scale-[1.02]'
                      : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white hover:shadow-xl hover:scale-[1.02]'
                }`}
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Processing...
                  </>
                ) : paymentMethod === 'CREDIT' ? (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Create Credit Bill (F9)
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Bill & Save (F9)
                  </>
                )}
              </button>
              
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 018.618 3.04A12.02 12.02 0 0112 5.5c0 3.037-1.15 5.776-3.04 7.618" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Transaction Secured</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {paymentMethod === 'CREDIT' 
                        ? 'Credit bills logged with customer, due date & cashier. Stock deducted. Outstanding balance updated.'
                        : 'All sales logged with cashier ID, timestamp & payment method. Stock deducted after billing.'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t-2 border-gray-100">
                <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Keyboard Shortcuts
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'F2', label: 'Focus Search', icon: '🔍', color: 'blue' },
                    { key: 'F4', label: 'Clear Cart', icon: '🗑️', color: 'red' },
                    { key: 'F9', label: paymentMethod === 'CREDIT' ? 'Create Credit Bill' : 'Print & Save', icon: paymentMethod === 'CREDIT' ? '📄' : '🖨️', color: paymentMethod === 'CREDIT' ? 'purple' : 'green' },
                    { key: 'Ctrl+1/2/3', label: 'Select Payment', icon: '💰', color: 'amber' },
                    { key: 'Ctrl+Alt+E/N', label: 'Credit Customer', icon: '👤', color: 'purple' },
                    { key: '↑↓', label: 'Navigate Cart', icon: '📋', color: 'gray' },
                    { key: '⌫', label: 'Remove Item', icon: '🗑️', color: 'red' },
                  ].map(({ key, label, icon, color }) => (
                    <div key={key} className={`flex items-center gap-2 text-xs bg-${color}-50 p-2.5 rounded-lg border border-${color}-100`}>
                      <kbd className={`px-2 py-1 bg-white rounded border-2 border-${color}-300 font-mono font-bold text-${color}-700 shadow-sm`}>
                        {key}
                      </kbd>
                      <span className="flex items-center gap-1 text-gray-700">
                        <span>{icon}</span>
                        <span className="font-medium">{label}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CashBilling;