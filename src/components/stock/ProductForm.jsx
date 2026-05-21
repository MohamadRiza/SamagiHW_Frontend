import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

const ProductForm = ({ product, onSubmit, onCancel, loading }) => {
  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm({
    defaultValues: product || {
      item_name: '',
      short_form: '',
      buying_price: '',
      selling_price: '',
      stock_quantity: 0,
      discount_type: 'percent',
      discount_value: 0,
      company: '',
      is_credit_item: false
    }
  });

  const [previewPrice, setPreviewPrice] = useState(0);
  const discountType = watch('discount_type');
  const discountValue = watch('discount_value');
  const sellingPrice = watch('selling_price');
  const isCreditItem = watch('is_credit_item');

  // Refs for keyboard nav
  const fieldRefs = {
    item_name: useRef(null),
    short_form: useRef(null),
    buying_price: useRef(null),
    selling_price: useRef(null),
    stock_quantity: useRef(null),
    discount_type: useRef(null),
    discount_value: useRef(null),
    company: useRef(null),
    submit: useRef(null),
  };

  const fieldOrder = [
    'item_name', 'short_form', 'buying_price', 'selling_price',
    'stock_quantity', 'discount_type', 'discount_value', 'company', 'submit'
  ];

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

  const onFormSubmit = (data) => {
    onSubmit({
      ...data,
      buying_price: parseFloat(data.buying_price),
      selling_price: parseFloat(data.selling_price),
      stock_quantity: parseInt(data.stock_quantity) || 0,
      discount_value: parseFloat(data.discount_value) || 0
    });
  };

  const registerWithRef = (name, options = {}) => {
    const { ref: hookRef, ...rest } = register(name, options);
    return {
      ...rest,
      ref: (el) => {
        hookRef(el);
        fieldRefs[name].current = el;
      }
    };
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4" noValidate>
      {/* Item Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Item Name <span className="text-red-500">*</span>
        </label>
        <input
          {...registerWithRef('item_name', { required: 'Item name is required' })}
          className="input-pos w-full"
          placeholder="e.g., Cement Bag 50kg"
          onKeyDown={(e) => handleKeyDown(e, 'item_name')}
          autoComplete="off"
        />
        {errors.item_name && <p className="mt-1 text-sm text-red-600">{errors.item_name.message}</p>}
      </div>

      {/* Short Form & Barcode */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Short Form</label>
          <input
            {...registerWithRef('short_form')}
            className="input-pos w-full"
            placeholder="e.g., CEM50"
            maxLength={20}
            onKeyDown={(e) => handleKeyDown(e, 'short_form')}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
          <input
            type="text"
            value={product?.barcode || 'Auto-generated'}
            readOnly
            tabIndex={-1}
            className="input-pos bg-gray-50 cursor-not-allowed font-mono text-sm w-full"
          />
          <p className="mt-1 text-xs text-gray-500">Auto-generated on save</p>
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cost (LKR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...registerWithRef('buying_price', {
              required: 'Buying price is required',
              valueAsNumber: true
            })}
            className="input-pos w-full"
            placeholder="0.00"
            onKeyDown={(e) => handleKeyDown(e, 'buying_price')}
          />
          {errors.buying_price && <p className="mt-1 text-sm text-red-600">{errors.buying_price.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
            className="input-pos w-full"
            placeholder="0.00"
            onKeyDown={(e) => handleKeyDown(e, 'selling_price')}
          />
          {errors.selling_price && <p className="mt-1 text-sm text-red-600">{errors.selling_price.message}</p>}
        </div>
      </div>

      {/* Stock & Discount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
          <input
            type="number"
            min="0"
            {...registerWithRef('stock_quantity', { valueAsNumber: true })}
            className="input-pos w-full"
            placeholder="0"
            onKeyDown={(e) => handleKeyDown(e, 'stock_quantity')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Discount</label>
          <div className="flex gap-2">
            <select
              {...registerWithRef('discount_type')}
              className="input-pos w-24"
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
              className="input-pos flex-1"
              placeholder="0"
              onKeyDown={(e) => handleKeyDown(e, 'discount_value')}
            />
          </div>
        </div>
      </div>

      {/* Discount Preview */}
      {sellingPrice > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Final Price:</strong>{' '}
            {discountValue > 0 ? (
              <>
                LKR {parseFloat(sellingPrice).toFixed(2)}
                {discountType === 'percent' ? ` − ${discountValue}%` : ` − LKR ${discountValue}`}
                {' = '}
              </>
            ) : null}
            <strong className="text-blue-700">LKR {previewPrice}</strong>
          </p>
        </div>
      )}

      {/* Company / Credit */}
      <div>
        <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('is_credit_item')}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            tabIndex={-1}
          />
          <span className="text-sm font-medium text-gray-700">Credit Purchase Item</span>
        </label>
        <input
          {...registerWithRef('company')}
          className={`input-pos w-full ${!isCreditItem ? 'opacity-50' : ''}`}
          placeholder="Supplier company name (optional)"
          disabled={!isCreditItem}
          onKeyDown={(e) => handleKeyDown(e, 'company')}
          autoComplete="off"
        />
        <p className="mt-1 text-xs text-gray-500">
          Used for tracking credit purchases and supplier payments
        </p>
      </div>

      {/* Timestamps */}
      {product?.created_at && (
        <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p>Created: {new Date(product.created_at).toLocaleString('en-LK')}</p>
          {product.updated_at !== product.created_at && (
            <p>Updated: {new Date(product.updated_at).toLocaleString('en-LK')}</p>
          )}
        </div>
      )}

      

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          ref={fieldRefs.submit}
          disabled={loading}
          onKeyDown={handleSubmitKeyDown}
          className="btn-primary flex-1 disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Cancel <span className="text-xs text-gray-400 ml-1">(Esc)</span>
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center">Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> to move between fields · <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">Esc</kbd> to close</p>
    </form>
  );
};

export default ProductForm;