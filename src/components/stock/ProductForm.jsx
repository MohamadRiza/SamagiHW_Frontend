import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { FaInfoCircle } from 'react-icons/fa';

/**
 * ProductForm
 *
 * Changes vs original:
 *  - Removed "Short Form" field
 *  - Added up to 4 "Compatible Brand" fields (sub_brands), each max 20 chars
 *  - sub_brands are saved as a comma-separated string in the `sub_brands` column
 *  - Barcode still auto-generated, shown read-only
 *  - All other fields and keyboard navigation unchanged
 */
const ProductForm = ({ product, onSubmit, onCancel, loading }) => {
  // Parse existing sub_brands string into an array of up to 4 items
  const parseBrands = (raw) => {
    if (!raw) return ['', '', '', ''];
    const parts = raw.split(',').map((s) => s.trim()).slice(0, 4);
    while (parts.length < 4) parts.push('');
    return parts;
  };

  const [brands, setBrands] = useState(() => parseBrands(product?.sub_brands));
  const [previewPrice, setPreviewPrice] = useState(0);

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm({
    defaultValues: product || {
      item_name: '',
      buying_price: '',
      selling_price: '',
      stock_quantity: 0,
      discount_type: 'percent',
      discount_value: 0,
      company: '',
      is_credit_item: false
    }
  });

  const discountType = watch('discount_type');
  const discountValue = watch('discount_value');
  const sellingPrice = watch('selling_price');
  const isCreditItem = watch('is_credit_item');

  // Refs for keyboard navigation
  const fieldRefs = {
    item_name: useRef(null),
    brand0: useRef(null),
    brand1: useRef(null),
    brand2: useRef(null),
    brand3: useRef(null),
    buying_price: useRef(null),
    selling_price: useRef(null),
    stock_quantity: useRef(null),
    discount_type: useRef(null),
    discount_value: useRef(null),
    company: useRef(null),
    submit: useRef(null),
  };

  const fieldOrder = [
    'item_name',
    'brand0', 'brand1', 'brand2', 'brand3',
    'buying_price', 'selling_price',
    'stock_quantity', 'discount_type', 'discount_value', 'company', 'submit'
  ];

  // Re-sync brands when editing a different product
  useEffect(() => {
    setBrands(parseBrands(product?.sub_brands));
  }, [product?.sub_brands]);

  // Auto-focus first field on mount
  useEffect(() => {
    setTimeout(() => {
      fieldRefs.item_name.current?.focus();
    }, 50);
  }, []);

  // Calculate preview price
  useEffect(() => {
    if (sellingPrice && discountValue) {
      const price = parseFloat(sellingPrice);
      const discount = parseFloat(discountValue);
      const final = discountType === 'percent'
        ? price - (price * discount / 100)
        : price - discount;
      setPreviewPrice(Math.max(0, final).toFixed(2));
    } else {
      setPreviewPrice(sellingPrice ? parseFloat(sellingPrice).toFixed(2) : 0);
    }
  }, [sellingPrice, discountValue, discountType]);

  // Move focus forward on Enter
  const handleKeyDown = (e, currentField) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = fieldOrder.indexOf(currentField);
      const nextField = fieldOrder[currentIndex + 1];
      if (nextField === 'submit') {
        fieldRefs.submit.current?.focus();
      } else if (nextField && fieldRefs[nextField]?.current) {
        fieldRefs[nextField].current?.focus();
      }
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleSubmitKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSubmit(onFormSubmit)();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const registerWithRef = (name, options = {}) => {
    const { ref: hookRef, ...rest } = register(name, options);
    return {
      ...rest,
      ref: (el) => {
        hookRef(el);
        if (fieldRefs[name]) fieldRefs[name].current = el;
      }
    };
  };

  // Handle brand field change
  const handleBrandChange = (index, value) => {
    const updated = [...brands];
    // Enforce max 20 chars
    updated[index] = value.slice(0, 20);
    setBrands(updated);
  };

  const onFormSubmit = (data) => {
    // Build sub_brands string from non-empty brand fields
    const subBrandsStr = brands.filter((b) => b.trim() !== '').join(',') || null;

    onSubmit({
      ...data,
      sub_brands: subBrandsStr,
      // short_form removed — keep null for backward compat
      short_form: null,
      buying_price: parseFloat(data.buying_price),
      selling_price: parseFloat(data.selling_price),
      stock_quantity: parseInt(data.stock_quantity) || 0,
      discount_value: parseFloat(data.discount_value) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-3.5" noValidate>

      {/* ── Item Name & Barcode ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Item Name <span className="text-red-500">*</span>
          </label>
          <input
            {...registerWithRef('item_name', { required: 'Item name is required' })}
            className="input-pos w-full text-sm py-2"
            placeholder="e.g., Side Mirror"
            onKeyDown={(e) => handleKeyDown(e, 'item_name')}
            autoComplete="off"
          />
          {errors.item_name && <p className="mt-1 text-xs text-red-600">{errors.item_name.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Barcode</label>
          <input
            type="text"
            value={product?.barcode || 'Auto-generated on save'}
            readOnly
            tabIndex={-1}
            className="input-pos bg-gray-50 cursor-not-allowed font-mono text-xs w-full py-2"
          />
          <p className="mt-0.5 text-[10px] text-gray-400">Auto-generated Code128</p>
        </div>
      </div>

      {/* ── Compatible Brands (sub_brands) — up to 4, max 20 chars each ── */}
      <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
        <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
          <span>Compatible Brands</span>
          <span className="text-[10px] text-gray-400 font-normal">up to 4 · max 20 chars each</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {brands.map((brand, i) => (
            <div key={i} className="relative">
              <input
                ref={fieldRefs[`brand${i}`]}
                type="text"
                value={brand}
                maxLength={20}
                placeholder={`Brand ${i + 1} (${['SUZUKI', 'TOYOTA', 'HONDA', 'MAZDA'][i]})`}
                onChange={(e) => handleBrandChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, `brand${i}`)}
                className="input-pos w-full text-xs py-1.5 pr-8 bg-white"
                autoComplete="off"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">
                {brand.length}/20
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Prices ── */}
      <div className="grid grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Cost Price (LKR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...registerWithRef('buying_price', {
              required: 'Buying price is required',
              valueAsNumber: true
            })}
            className="input-pos w-full text-sm py-2"
            placeholder="0.00"
            onKeyDown={(e) => handleKeyDown(e, 'buying_price')}
          />
          {errors.buying_price && <p className="mt-1 text-xs text-red-600">{errors.buying_price.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Selling Price (LKR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...registerWithRef('selling_price', {
              required: 'Selling price is required',
              valueAsNumber: true
            })}
            className="input-pos w-full text-sm py-2"
            placeholder="0.00"
            onKeyDown={(e) => handleKeyDown(e, 'selling_price')}
          />
          {errors.selling_price && <p className="mt-1 text-xs text-red-600">{errors.selling_price.message}</p>}
        </div>
      </div>

      {/* ── Stock & Discount ── */}
      <div className="grid grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Stock Quantity</label>
          <input
            type="number"
            min="0"
            {...registerWithRef('stock_quantity', { valueAsNumber: true })}
            className="input-pos w-full text-sm py-2"
            placeholder="0"
            onKeyDown={(e) => handleKeyDown(e, 'stock_quantity')}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Default Discount</label>
          <div className="flex gap-2">
            <select
              {...registerWithRef('discount_type')}
              className="input-pos w-20 text-xs py-2 bg-white"
              onKeyDown={(e) => handleKeyDown(e, 'discount_type')}
            >
              <option value="percent">%</option>
              <option value="amount">LKR</option>
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              {...registerWithRef('discount_value', { valueAsNumber: true })}
              className="input-pos flex-1 text-sm py-2"
              placeholder="0"
              onKeyDown={(e) => handleKeyDown(e, 'discount_value')}
            />
          </div>
        </div>
      </div>

      {/* ── Discount Preview ── */}
      {sellingPrice > 0 && (
        <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200">
          <p className="text-xs text-blue-900">
            <strong>Final Price (after discount):</strong>{' '}
            {discountValue > 0 ? (
              <>
                LKR {parseFloat(sellingPrice).toFixed(2)}
                {discountType === 'percent' ? ` − ${discountValue}%` : ` − LKR ${discountValue}`}
                {' = '}
              </>
            ) : null}
            <strong className="text-blue-700 font-black">LKR {previewPrice}</strong>
          </p>
          <p className="text-[11px] text-blue-600 mt-0.5 flex items-center gap-1">
            <FaInfoCircle className="w-3 h-3 shrink-0 text-blue-600" />
            <span>Label prints real selling price (LKR {parseFloat(sellingPrice || 0).toFixed(2)})</span>
          </p>
        </div>
      )}

      {/* ── Company / Credit ── */}
      <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
        <label className="flex items-center gap-2 mb-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('is_credit_item')}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            tabIndex={-1}
          />
          <span className="text-xs font-bold text-gray-700">Credit Purchase Item</span>
        </label>
        <input
          {...registerWithRef('company')}
          className={`input-pos w-full text-xs py-1.5 bg-white ${!isCreditItem ? 'opacity-50' : ''}`}
          placeholder="Supplier company name (optional)"
          disabled={!isCreditItem}
          onKeyDown={(e) => handleKeyDown(e, 'company')}
          autoComplete="off"
        />
      </div>

      {/* ── Timestamps (edit mode) ── */}
      {product?.created_at && (
        <div className="p-2 bg-gray-50 rounded-lg text-[11px] text-gray-500 flex justify-between">
          <span>Created: {new Date(product.created_at).toLocaleDateString('en-LK')}</span>
          {product.updated_at !== product.created_at && (
            <span>Updated: {new Date(product.updated_at).toLocaleDateString('en-LK')}</span>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-3 border-t">
        <button
          type="submit"
          ref={fieldRefs.submit}
          disabled={loading}
          onKeyDown={handleSubmitKeyDown}
          className="btn-primary flex-1 py-2.5 text-sm font-bold disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Saving...
            </span>
          ) : product ? 'Update Product' : 'Add Product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onCancel(); }}
          className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Cancel <span className="text-xs text-gray-400 ml-1">(Esc)</span>
        </button>
      </div>

      <p className="text-[11px] text-gray-400 text-center">
        Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> to move between fields ·{' '}
        <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">Esc</kbd> to close
      </p>
    </form>
  );
};

export default ProductForm;