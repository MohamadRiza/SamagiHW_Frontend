import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

const ProductForm = ({ product, onSubmit, onCancel, loading }) => {
  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm({
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
  
  // Calculate preview price with discount
  useEffect(() => {
    if (sellingPrice && discountValue) {
      const price = parseFloat(sellingPrice);
      const discount = parseFloat(discountValue);
      const final = discountType === 'percent' 
        ? price - (price * discount / 100)
        : price - discount;
      setPreviewPrice(Math.max(0, final).toFixed(2));
    }
  }, [sellingPrice, discountValue, discountType]);
  
  const onFormSubmit = (data) => {
    onSubmit({
      ...data,
      buying_price: parseFloat(data.buying_price),
      selling_price: parseFloat(data.selling_price),
      stock_quantity: parseInt(data.stock_quantity) || 0,
      discount_value: parseFloat(data.discount_value) || 0
    });
  };
  
  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Item Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Item Name <span className="text-red-500">*</span>
        </label>
        <input
          {...register('item_name', { required: 'Item name is required' })}
          className="input-pos"
          placeholder="e.g., Cement Bag 50kg"
        />
        {errors.item_name && <p className="mt-1 text-sm text-red-600">{errors.item_name.message}</p>}
      </div>
      
      {/* Short Form & Barcode */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Short Form</label>
          <input
            {...register('short_form')}
            className="input-pos"
            placeholder="e.g., CEM50"
            maxLength={20}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
          <input
            type="text"
            value={product?.barcode || 'Auto-generated'}
            readOnly
            className="input-pos bg-gray-50 cursor-not-allowed font-mono text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">Auto-generated on save</p>
        </div>
      </div>
      
      {/* Prices */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buying Price (LKR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('buying_price', { 
              required: 'Buying price is required',
              valueAsNumber: true 
            })}
            className="input-pos"
            placeholder="0.00"
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
            {...register('selling_price', { 
              required: 'Selling price is required',
              valueAsNumber: true 
            })}
            className="input-pos"
            placeholder="0.00"
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
            {...register('stock_quantity', { valueAsNumber: true })}
            className="input-pos"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Discount</label>
          <div className="flex gap-2">
            <select
              {...register('discount_type')}
              className="input-pos w-24"
            >
              <option value="percent">%</option>
              <option value="amount">LKR</option>
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('discount_value', { valueAsNumber: true })}
              className="input-pos"
              placeholder="0"
            />
          </div>
        </div>
      </div>
      
      {/* Discount Preview */}
      {sellingPrice && discountValue && (
        <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
          <p className="text-sm text-primary-800">
            <strong>Preview:</strong> Selling at LKR {sellingPrice} 
            {discountType === 'percent' 
              ? ` - ${discountValue}% = ` 
              : ` - LKR ${discountValue} = `
            }
            <strong className="text-primary-700">LKR {previewPrice}</strong>
          </p>
        </div>
      )}
      
      {/* Company (Credit Items) */}
      <div>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            {...register('is_credit_item')}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-gray-700">Credit Purchase Item</span>
        </label>
        <input
          {...register('company')}
          className="input-pos"
          placeholder="Supplier company name (optional)"
          disabled={!watch('is_credit_item')}
        />
        <p className="mt-1 text-xs text-gray-500">
          Used for tracking credit purchases and supplier payments
        </p>
      </div>
      
      {/* Auto Date Display */}
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
          disabled={loading}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {loading ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ProductForm;