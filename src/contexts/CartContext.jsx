import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const CartContext = createContext();

const STORAGE_KEY = 'samagi_pos_active_cart';

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage:', e);
    }
    return [];
  });

  // Persist cart changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to persist cart to localStorage:', e);
    }
  }, [cart]);

  // Add product to cart with custom modal data (quantity, discount, etc.)
  const addToCart = useCallback((product, modalData = {}) => {
    if (!product || !product.id) return false;

    const {
      quantity = 1,
      discountMode = 'default',
      discountValue = 0,
      discountType = 'fixed',
      discountLKR = 0
    } = modalData;

    let addedSuccessfully = true;

    setCart((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const existingIndex = safePrev.findIndex((item) => item.product_id === product.id);

      if (existingIndex > -1) {
        const existing = safePrev[existingIndex];
        const newQty = (existing.quantity || 0) + quantity;
        const maxStock = product.stock_quantity ?? existing.max_stock ?? 0;

        if (newQty > maxStock) {
          toast.error(`⚠️ Max available stock is ${maxStock}`);
          addedSuccessfully = false;
          return prev;
        }

        const updated = [...safePrev];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          max_stock: maxStock,
        };
        return updated;
      }

      // Check initial stock limit
      const maxStock = product.stock_quantity || 0;
      if (quantity > maxStock) {
        toast.error(`⚠️ Max available stock is ${maxStock}`);
        addedSuccessfully = false;
        return prev;
      }

      const autoDiscount =
        discountMode === 'default'
          ? product.discount_type === 'percent'
            ? ((product.selling_price || 0) * (product.discount_value || 0)) / 100
            : product.discount_value || 0
          : 0;

      const newItem = {
        product_id: product.id,
        product_name: product.item_name || '',
        barcode: product.barcode || '',
        short_form: product.short_form || '',
        unit_price: parseFloat(product.selling_price) || 0,
        quantity: quantity,
        max_stock: maxStock,
        discount_mode: discountMode,
        discount_value: discountValue,
        discount_type: discountType,
        auto_discount_lkr: autoDiscount,
        discount_lkr: discountMode === 'default' ? autoDiscount : discountLKR,
        is_custom: false
      };

      return [...safePrev, newItem];
    });

    return addedSuccessfully;
  }, []);

  // Remove single item from cart
  const removeFromCart = useCallback((productId) => {
    setCart((prev) => (Array.isArray(prev) ? prev.filter((i) => i.product_id !== productId) : []));
  }, []);

  // Update specific item in cart
  const updateCartItem = useCallback((index, field, value) => {
    setCart((prev) => {
      if (!Array.isArray(prev) || index < 0 || index >= prev.length) return prev;
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'quantity') {
        const q = parseInt(value, 10) || 0;
        if (q <= 0) {
          toast.error('⚠️ Minimum quantity is 1');
          return prev;
        }
        if (q > (item.max_stock || 0)) {
          toast.error(`⚠️ Max stock available: ${item.max_stock}`);
          return prev;
        }
        item.quantity = q;
      } else if (field === 'discount_mode') {
        item.discount_mode = value;
        if (value === 'default') {
          item.discount_lkr = item.auto_discount_lkr || 0;
          item.discount_value = item.discount_value || 0;
          item.discount_type = item.discount_type || 'fixed';
        } else if (value === 'percent') {
          item.discount_value = 0;
          item.discount_lkr = 0;
          item.discount_type = 'percent';
        } else if (value === 'fixed') {
          item.discount_value = 0;
          item.discount_lkr = 0;
          item.discount_type = 'fixed';
        }
      } else if (field === 'discount_value') {
        const v = parseFloat(value) || 0;
        if (v < 0) {
          toast.error('⚠️ Discount cannot be negative');
          return prev;
        }
        item.discount_value = v;
        if (item.discount_mode === 'percent') {
          if (v > 100) {
            toast.error('⚠️ Maximum percentage is 100%');
            item.discount_value = 100;
            item.discount_lkr = item.unit_price || 0;
          } else {
            item.discount_lkr = ((item.unit_price || 0) * v) / 100;
          }
        } else if (item.discount_mode === 'fixed') {
          if (v > (item.unit_price || 0)) {
            toast.error('⚠️ Discount cannot exceed item price');
            item.discount_value = item.unit_price || 0;
            item.discount_lkr = item.unit_price || 0;
          } else {
            item.discount_lkr = v;
          }
        }
      }

      updated[index] = item;
      return updated;
    });
  }, []);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Total quantity of items in cart
  const itemCount = useMemo(() => {
    if (!Array.isArray(cart)) return 0;
    return cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [cart]);

  // Sidebar badge formatted string: null, '1'-'9', '9+'
  const badgeText = useMemo(() => {
    if (itemCount <= 0) return null;
    return itemCount > 9 ? '9+' : String(itemCount);
  }, [itemCount]);

  const value = useMemo(
    () => ({
      cart,
      setCart,
      addToCart,
      removeFromCart,
      updateCartItem,
      clearCart,
      itemCount,
      badgeText,
    }),
    [cart, addToCart, removeFromCart, updateCartItem, clearCart, itemCount, badgeText]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
