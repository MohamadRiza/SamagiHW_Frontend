import { useState, useMemo } from "react";
import BarcodeGenerator from "./BarcodeGenerator";

const ProductTable = ({
  products,
  onEdit,
  onDelete,
  onPrintBarcode,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCredit, setFilterCredit] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.short_form?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCredit = !filterCredit || p.is_credit_item;

      return matchesSearch && matchesCredit;
    });
  }, [products, searchTerm, filterCredit]);

  // Calculate final price with discount
  const getFinalPrice = (product) => {
    return product.discount_type === "percent"
      ? product.selling_price -
          (product.selling_price * product.discount_value) / 100
      : product.selling_price - product.discount_value;
  };

  const getStockStatus = (stock) => {
    if (stock <= 0)
      return { label: "Out of Stock", class: "bg-red-100 text-red-800" };
    if (stock <= 10)
      return { label: "Low Stock", class: "bg-amber-100 text-amber-800" };
    return { label: "In Stock", class: "bg-emerald-100 text-emerald-800" };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Search & Filter Bar */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, barcode, or short form..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-pos pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={filterCredit}
              onChange={(e) => setFilterCredit(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Credit Items Only
          </label>

          <span className="text-sm text-gray-500">
            {filteredProducts.length} of {products.length} items
          </span>
        </div>
      </div>

      {/* Products Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Barcode
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Item
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Prices (LKR)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Discount
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Loading products...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {searchTerm || filterCredit
                    ? "No matching products found"
                    : "No products added yet"}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock_quantity);
                const finalPrice = getFinalPrice(product);

                return (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      #{product.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {product.barcode}
                        </code>
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="text-primary-600 hover:text-primary-700 text-xs"
                          title="View Barcode"
                        >
                          👁️
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {product.item_name}
                        </p>
                        {product.short_form && (
                          <p className="text-xs text-gray-500">
                            {product.short_form}
                          </p>
                        )}
                        {product.company && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            {product.company}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="text-gray-900">
                          Sell:{" "}
                          <strong>
                            LKR {product.selling_price.toFixed(2)}
                          </strong>
                        </p>
                        <p className="text-xs text-gray-500">
                          Cost: LKR {product.buying_price.toFixed(2)}
                        </p>
                        <p className="text-xs font-medium text-primary-700">
                          Final: LKR {finalPrice.toFixed(2)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.class}`}
                      >
                        {product.stock_quantity} {stockStatus.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {product.discount_value > 0 ? (
                        <span className="text-amber-700">
                          {product.discount_value}
                          {product.discount_type === "percent" ? "%" : ""}
                        </span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEdit(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() =>
                            onPrintBarcode({
                              ...product,
                              final_price:
                                product.discount_type === "percent"
                                  ? product.selling_price -
                                    (product.selling_price *
                                      product.discount_value) /
                                      100
                                  : product.selling_price -
                                    product.discount_value,
                            })
                          }
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Print Barcode"
                        >
                          🖨️
                        </button>
                        <button
                          onClick={() => onDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Barcode Preview Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Barcode Preview</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <BarcodeGenerator
              barcode={selectedProduct.barcode}
              item_name={selectedProduct.item_name}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTable;
