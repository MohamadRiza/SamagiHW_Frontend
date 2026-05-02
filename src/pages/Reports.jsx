import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import ReportService from '../services/report.service';
import { Toaster, toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(false);
  
  // Today's summary state
  const [todaySummary, setTodaySummary] = useState(null);
  
  // Sales report state
  const [salesReport, setSalesReport] = useState(null);
  const [salesFilters, setSalesFilters] = useState({
    dateFrom: new Date().toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    paymentMethod: '',
    cashier: '',
    sortBy: 'created_at',
    order: 'DESC'
  });
  
  // Stock report state
  const [stockReport, setStockReport] = useState(null);
  const [stockFilters, setStockFilters] = useState({
    search: '',
    lowStockOnly: false,
    company: '',
    sortBy: 'item_name',
    order: 'ASC'
  });

  // Fetch data on mount and tab change
  useEffect(() => {
    if (activeTab === 'today') {
      fetchTodaySummary();
    } else if (activeTab === 'sales') {
      fetchSalesReport();
    } else if (activeTab === 'stock') {
      fetchStockReport();
    }
  }, [activeTab]);

  const fetchTodaySummary = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching today summary...');
      const response = await ReportService.getTodaySummary();
      console.log('✅ Today summary response:', response);
      
      if (response?.success && response.data) {
        setTodaySummary(response.data);
        toast.success('Today\'s summary loaded');
      } else {
        toast.error(response?.error || 'Failed to fetch today summary');
      }
    } catch (error) {
      console.error('❌ Fetch today summary error:', error);
      toast.error('Network error loading summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesReport = async () => {
    try {
      setLoading(true);
      console.log('💰 Fetching sales report with filters:', salesFilters);
      const response = await ReportService.getSalesReport(salesFilters);
      console.log('✅ Sales report response:', response);
      
      if (response?.success && response.data) {
        setSalesReport(response.data);
        toast.success(`Loaded ${response.data.bills?.length || 0} sales records`);
      } else {
        toast.error(response?.error || 'Failed to fetch sales report');
      }
    } catch (error) {
      console.error('❌ Fetch sales report error:', error);
      toast.error('Network error loading sales report');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockReport = async () => {
    try {
      setLoading(true);
      console.log('📦 Fetching stock report with filters:', stockFilters);
      const response = await ReportService.getStockReport(stockFilters);
      console.log('✅ Stock report response:', response);
      
      if (response?.success && response.data) {
        setStockReport(response.data);
        toast.success(`Loaded ${response.data.products?.length || 0} products`);
      } else {
        toast.error(response?.error || 'Failed to fetch stock report');
      }
    } catch (error) {
      console.error('❌ Fetch stock report error:', error);
      toast.error('Network error loading stock report');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatLKR = (amount) => {
    const num = parseFloat(amount) || 0;
    return `LKR ${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-LK', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Export to Excel
  const exportToExcel = (data, fileName, sheetName = 'Report') => {
    try {
      if (!data || data.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('✅ Excel file downloaded');
    } catch (error) {
      console.error('Export to Excel error:', error);
      toast.error('❌ Failed to export Excel');
    }
  };

  // Export to PDF
  const exportToPDF = (data, columns, fileName, title) => {
    try {
      if (!data || data.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      
      doc.autoTable({
        head: [columns.map(col => col.header)],
        body: data.map(row => columns.map(col => {
          const val = row[col.accessor];
          return typeof val === 'number' ? val.toFixed(2) : (val || '');
        })),
        startY: 35,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      doc.save(`${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('✅ PDF file downloaded');
    } catch (error) {
      console.error('Export to PDF error:', error);
      toast.error('❌ Failed to export PDF');
    }
  };

  // Render Today's Summary Tab
  const renderTodaySummary = () => {
    console.log('📊 Rendering today summary, data:', todaySummary);
    
    if (!todaySummary) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4">
              <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
            <p className="text-gray-600">Loading today's summary...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Today's Summary</h2>
          <button
            onClick={fetchTodaySummary}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            ) : (
              '🔄 Refresh'
            )}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
            <p className="text-xs text-green-600 font-medium">Cash Sales</p>
            <p className="text-2xl font-black text-green-700 mt-1">{formatLKR(todaySummary.cashSales?.total || 0)}</p>
            <p className="text-xs text-green-600 mt-1">{todaySummary.cashSales?.count || 0} bills</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
            <p className="text-xs text-blue-600 font-medium">Credit Sales</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{formatLKR(todaySummary.creditSales?.total || 0)}</p>
            <p className="text-xs text-blue-600 mt-1">{todaySummary.creditSales?.count || 0} bills</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
            <p className="text-xs text-red-600 font-medium">Expenses</p>
            <p className="text-2xl font-black text-red-700 mt-1">{formatLKR(todaySummary.expenses?.total || 0)}</p>
            <p className="text-xs text-red-600 mt-1">{todaySummary.expenses?.count || 0} expenses</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
            <p className="text-xs text-purple-600 font-medium">Net Profit</p>
            <p className={`text-2xl font-black mt-1 ${todaySummary.netProfit >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
              {formatLKR(todaySummary.netProfit || 0)}
            </p>
            <p className="text-xs text-purple-600 mt-1">Today's earnings</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600">Purchases</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatLKR(todaySummary.purchases?.total || 0)}</p>
            <p className="text-xs text-gray-500">{todaySummary.purchases?.count || 0} purchases</p>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600">Cheques</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatLKR(todaySummary.cheques?.total || 0)}</p>
            <p className="text-xs text-gray-500">{todaySummary.cheques?.count || 0} cheques</p>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600">Low Stock Items</p>
            <p className="text-xl font-bold text-red-600 mt-1">{todaySummary.lowStock || 0}</p>
            <p className="text-xs text-gray-500">Need attention</p>
          </div>
        </div>
      </div>
    );
  };

  // Render Sales Report Tab
  const renderSalesReport = () => {
    console.log('💰 Rendering sales report, data:', salesReport);
    
    if (!salesReport) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4">
              <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
            <p className="text-gray-600">Loading sales report...</p>
          </div>
        </div>
      );
    }

    const bills = salesReport.bills || [];
    const totals = salesReport.totals || {};

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Sales Report</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportToExcel(bills, 'Sales_Report', 'Sales')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              📊 Excel
            </button>
            <button
              onClick={() => {
                const columns = [
                  { header: 'Bill #', accessor: 'bill_number' },
                  { header: 'Date', accessor: 'created_at' },
                  { header: 'Items', accessor: 'item_count' },
                  { header: 'Total', accessor: 'grand_total' },
                  { header: 'Discount', accessor: 'total_discount' },
                  { header: 'Payment', accessor: 'payment_method' }
                ];
                exportToPDF(bills, columns, 'Sales_Report', 'Sales Report');
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              📄 PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input
                type="date"
                value={salesFilters.dateFrom}
                onChange={(e) => setSalesFilters({...salesFilters, dateFrom: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input
                type="date"
                value={salesFilters.dateTo}
                onChange={(e) => setSalesFilters({...salesFilters, dateTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
              <select
                value={salesFilters.paymentMethod}
                onChange={(e) => setSalesFilters({...salesFilters, paymentMethod: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchSalesReport}
                disabled={loading}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                {loading ? 'Loading...' : 'Apply Filters'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {bills.length > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">Total Bills</p>
                <p className="text-2xl font-bold text-gray-900">{totals.totalBills || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatLKR(totals.totalRevenue || 0)}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">Cash Sales</p>
                <p className="text-xl font-bold text-blue-600">{formatLKR(totals.cashSales || 0)}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">Card Sales</p>
                <p className="text-xl font-bold text-purple-600">{formatLKR(totals.cardSales || 0)}</p>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Bill #</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Items</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Discount</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{bill.bill_number}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(bill.created_at)}</td>
                        <td className="px-4 py-3 text-center text-sm">{bill.item_count}</td>
                        <td className="px-4 py-3 text-right font-bold text-sm">{formatLKR(bill.grand_total)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">{formatLKR(bill.total_discount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            bill.payment_method === 'CASH' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {bill.payment_method}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-semibold text-gray-600">No sales data found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your date range or filters</p>
          </div>
        )}
      </div>
    );
  };

  // Render Stock Report Tab
  const renderStockReport = () => {
    console.log('📦 Rendering stock report, data:', stockReport);
    
    if (!stockReport) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4">
              <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
            <p className="text-gray-600">Loading stock report...</p>
          </div>
        </div>
      );
    }

    const products = stockReport.products || [];
    const totals = stockReport.totals || {};

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Stock Report</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportToExcel(products, 'Stock_Report', 'Stock')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              📊 Excel
            </button>
            <button
              onClick={() => {
                const columns = [
                  { header: 'Barcode', accessor: 'barcode' },
                  { header: 'Item Name', accessor: 'item_name' },
                  { header: 'Stock', accessor: 'stock_quantity' },
                  { header: 'Buying Price', accessor: 'buying_price' },
                  { header: 'Selling Price', accessor: 'selling_price' },
                  { header: 'Status', accessor: 'stock_status' }
                ];
                exportToPDF(products, columns, 'Stock_Report', 'Stock Report');
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              📄 PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input
                type="text"
                value={stockFilters.search}
                onChange={(e) => setStockFilters({...stockFilters, search: e.target.value})}
                placeholder="Search by name, barcode..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
              <input
                type="text"
                value={stockFilters.company}
                onChange={(e) => setStockFilters({...stockFilters, company: e.target.value})}
                placeholder="Filter by company"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={stockFilters.lowStockOnly}
                  onChange={(e) => setStockFilters({...stockFilters, lowStockOnly: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Low Stock Only</span>
              </label>
              <button
                onClick={fetchStockReport}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                {loading ? 'Loading...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {products.length > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{totals.totalProducts || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">Stock Value</p>
                <p className="text-xl font-bold text-blue-600">{formatLKR(totals.totalStockValue || 0)}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">Retail Value</p>
                <p className="text-xl font-bold text-green-600">{formatLKR(totals.totalRetailValue || 0)}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{totals.lowStockCount || 0}</p>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Barcode</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Item Name</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Stock</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Buying Price</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Selling Price</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{product.barcode}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-sm">{product.item_name}</p>
                          {product.short_form && <p className="text-xs text-gray-500">{product.short_form}</p>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${
                            product.stock_quantity === 0 ? 'text-red-600' :
                            product.stock_quantity <= 10 ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            {product.stock_quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">{formatLKR(product.buying_price)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold">{formatLKR(product.selling_price)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            product.stock_quantity === 0 ? 'bg-red-100 text-red-700' :
                            product.stock_quantity <= 10 ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {product.stock_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-lg font-semibold text-gray-600">No stock data found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <Toaster position="top-right" />
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
              <p className="text-sm text-gray-500 mt-1">View and export business reports</p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white border-b px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('today')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'today'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Today's Summary
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sales'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              💰 Sales Report
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'stock'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📦 Stock Report
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {activeTab === 'today' && renderTodaySummary()}
          {activeTab === 'sales' && renderSalesReport()}
          {activeTab === 'stock' && renderStockReport()}
        </div>
      </main>
    </div>
  );
};

export default Reports;