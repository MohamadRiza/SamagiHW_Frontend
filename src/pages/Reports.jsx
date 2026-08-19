import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/layout';
import ReportService from '../services/report.service';
import { Toaster, toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  FaChartPie,
  FaCashRegister,
  FaReceipt,
  FaBox,
  FaBoxes,
  FaFileInvoiceDollar,
  FaShoppingCart,
  FaFileExcel,
  FaSyncAlt,
  FaCalendarDay,
  FaCalendarAlt,
  FaChartLine,
  FaMoneyCheckAlt,
  FaExclamationTriangle,
  FaTag,
  FaFilter,
  FaMoneyBillWave
} from 'react-icons/fa';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const formatLKR = (amount) => {
  const num = parseFloat(amount) || 0;
  return `LKR ${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// Build last-N-months dropdown items (including current month)
const buildMonthOptions = (count = 4) => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return options;
};

// Loading spinner
const Spinner = () => (
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
);

// KPI Card
const KpiCard = ({ label, value, sub, color = 'indigo', icon }) => {
  const colors = {
    green:  { bg: 'from-green-50 to-green-100',   border: 'border-green-200',  text: 'text-green-700',  sub: 'text-green-600', iconBg: 'bg-green-100 text-green-700' },
    blue:   { bg: 'from-blue-50 to-blue-100',     border: 'border-blue-200',   text: 'text-blue-700',   sub: 'text-blue-600',  iconBg: 'bg-blue-100 text-blue-700' },
    red:    { bg: 'from-red-50 to-red-100',       border: 'border-red-200',    text: 'text-red-700',    sub: 'text-red-600',   iconBg: 'bg-red-100 text-red-700' },
    purple: { bg: 'from-purple-50 to-purple-100', border: 'border-purple-200', text: 'text-purple-700', sub: 'text-purple-600',iconBg: 'bg-purple-100 text-purple-700' },
    amber:  { bg: 'from-amber-50 to-amber-100',   border: 'border-amber-200',  text: 'text-amber-700',  sub: 'text-amber-600', iconBg: 'bg-amber-100 text-amber-700' },
    indigo: { bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-200', text: 'text-indigo-700', sub: 'text-indigo-600',iconBg: 'bg-indigo-100 text-indigo-700' },
  };
  const c = colors[color] || colors.indigo;
  return (
    <div className={`bg-gradient-to-br ${c.bg} p-4 rounded-xl border ${c.border} shadow-sm`}>
      <div className="flex items-center justify-between mb-1">
        <p className={`text-xs font-semibold ${c.sub} uppercase tracking-wide`}>{label}</p>
        {icon && <span className={`p-2 rounded-lg ${c.iconBg} flex items-center justify-center`}>{icon}</span>}
      </div>
      <p className={`text-2xl font-black ${c.text} mt-1 truncate`}>{value}</p>
      {sub && <p className={`text-xs ${c.sub} mt-1 font-medium`}>{sub}</p>}
    </div>
  );
};

// Empty state
const EmptyState = ({ message = 'No data found', hint = 'Try adjusting your filters' }) => (
  <div className="flex flex-col items-center justify-center h-52 text-gray-400">
    <svg className="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
    <p className="font-semibold text-gray-600">{message}</p>
    <p className="text-sm text-gray-400 mt-1">{hint}</p>
  </div>
);

// ─── Excel export helper ───────────────────────────────────────────────────────
const exportToExcel = (rows, fileName, sheetName = 'Report') => {
  if (!rows || rows.length === 0) { toast.error('No data to export'); return; }
  try {
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto column widths
    const cols = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }));
    ws['!cols'] = cols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel file downloaded successfully');
  } catch (err) {
    console.error('Excel export error:', err);
    toast.error('Failed to export Excel');
  }
};

// Month quick-selector bar (shows current + last 3 months)
const MonthSelector = ({ selectedYear, selectedMonth, onChange }) => {
  const months = buildMonthOptions(4);
  return (
    <div className="flex flex-wrap gap-2">
      {months.map(({ year, month }) => {
        const isActive = selectedYear === year && selectedMonth === month;
        const label = month === new Date().getMonth() + 1 && year === new Date().getFullYear()
          ? 'This Month'
          : MONTH_NAMES[month - 1] + (year !== new Date().getFullYear() ? ` ${year}` : '');
        return (
          <button
            key={`${year}-${month}`}
            onClick={() => onChange(year, month)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

// ─── Date range quick-set helper ─────────────────────────────────────────────
const buildMonthRange = (year, month) => {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(false);

  // ── Today/Monthly summary ─────────────────────────────────────────────────
  const now = new Date();
  const [summaryMode, setSummaryMode] = useState('today'); // 'today' | 'month'
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1);
  const [todaySummary, setTodaySummary] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);

  // ── Sales report ──────────────────────────────────────────────────────────
  const [salesReport, setSalesReport] = useState(null);
  const [salesFilters, setSalesFilters] = useState({
    dateFrom: now.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
    paymentMethod: '',
    cashier: '',
    sortBy: 'created_at',
    order: 'DESC'
  });

  // ── Credit sales report ───────────────────────────────────────────────────
  const [creditReport, setCreditReport] = useState(null);
  const [creditFilters, setCreditFilters] = useState({
    dateFrom: now.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
    status: '',
    customer: '',
    sortBy: 'created_at',
    order: 'DESC'
  });

  // ── Stock report ──────────────────────────────────────────────────────────
  const [stockReport, setStockReport] = useState(null);
  const [stockFilters, setStockFilters] = useState({
    search: '',
    lowStockOnly: false,
    company: '',
    sortBy: 'item_name',
    order: 'ASC'
  });

  // ── Expense report ────────────────────────────────────────────────────────
  const [expenseReport, setExpenseReport] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [expenseFilters, setExpenseFilters] = useState({
    dateFrom: now.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
    categoryId: '',
    sortBy: 'expense_date',
    order: 'DESC'
  });

  // ── Purchase report ───────────────────────────────────────────────────────
  const [purchaseReport, setPurchaseReport] = useState(null);
  const [purchaseFilters, setPurchaseFilters] = useState({
    dateFrom: now.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
    billType: '',
    sortBy: 'purchase_date',
    order: 'DESC'
  });

  // ── Initial data loads ────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'today') fetchTodaySummary();
    else if (activeTab === 'sales') fetchSalesReport();
    else if (activeTab === 'credit') fetchCreditReport();
    else if (activeTab === 'stock') fetchStockReport();
    else if (activeTab === 'expenses') { fetchExpenseCategories(); fetchExpenseReport(); }
    else if (activeTab === 'purchases') fetchPurchaseReport();
  }, [activeTab]);

  // ── Fetch functions ───────────────────────────────────────────────────────
  const fetchTodaySummary = async () => {
    setLoading(true);
    try {
      const res = await ReportService.getTodaySummary();
      if (res.success && res.data) setTodaySummary(res.data);
      else toast.error(res.error || 'Failed to load today summary');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const fetchMonthlySummary = async (year, month) => {
    setLoading(true);
    try {
      const res = await ReportService.getMonthlySummary(year, month);
      if (res.success && res.data) setMonthlySummary(res.data);
      else toast.error(res.error || 'Failed to load monthly summary');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const fetchSalesReport = async (filters) => {
    setLoading(true);
    try {
      const res = await ReportService.getSalesReport(filters || salesFilters);
      if (res.success && res.data) setSalesReport(res.data);
      else toast.error(res.error || 'Failed to load sales report');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const fetchCreditReport = async (filters) => {
    setLoading(true);
    try {
      const res = await ReportService.getCreditSalesReport(filters || creditFilters);
      if (res.success && res.data) setCreditReport(res.data);
      else toast.error(res.error || 'Failed to load credit report');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const fetchStockReport = async (filters) => {
    setLoading(true);
    try {
      const res = await ReportService.getStockReport(filters || stockFilters);
      if (res.success && res.data) setStockReport(res.data);
      else toast.error(res.error || 'Failed to load stock report');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const fetchExpenseCategories = async () => {
    const res = await ReportService.getExpenseCategories();
    if (res.success) setExpenseCategories(res.data);
  };

  const fetchExpenseReport = async (filters) => {
    setLoading(true);
    try {
      const res = await ReportService.getExpenseReport(filters || expenseFilters);
      if (res.success && res.data) setExpenseReport(res.data);
      else toast.error(res.error || 'Failed to load expense report');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  const fetchPurchaseReport = async (filters) => {
    setLoading(true);
    try {
      const res = await ReportService.getPurchaseReport(filters || purchaseFilters);
      if (res.success && res.data) setPurchaseReport(res.data);
      else toast.error(res.error || 'Failed to load purchase report');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  };

  // ── Apply month preset to filter panels ───────────────────────────────────
  const applyMonthToFilters = (year, month, filterSetter, fetchFn, currentFilters) => {
    const { start, end } = buildMonthRange(year, month);
    const updated = { ...currentFilters, dateFrom: start, dateTo: end };
    filterSetter(updated);
    fetchFn(updated);
  };

  // ── TAB: Today's Summary ──────────────────────────────────────────────────
  const renderSummaryTab = () => {
    const isMonthMode = summaryMode === 'month';
    const data = isMonthMode ? monthlySummary : todaySummary;

    const handleMonthChange = (year, month) => {
      setSummaryYear(year);
      setSummaryMonth(month);
      fetchMonthlySummary(year, month);
    };

    const handleSummaryExcel = () => {
      if (!data) { toast.error('No data to export'); return; }
      const rows = [
        { Metric: 'Cash Sales Count',       Value: data.cashSales?.count || 0 },
        { Metric: 'Cash Sales Total',        Value: data.cashSales?.total || 0 },
        { Metric: 'Cash Sales Discount',     Value: data.cashSales?.discount || 0 },
        { Metric: 'Credit Sales Count',      Value: data.creditSales?.count || 0 },
        { Metric: 'Credit Sales Total',      Value: data.creditSales?.total || 0 },
        { Metric: 'Credit Outstanding',      Value: data.creditSales?.outstanding || 0 },
        { Metric: 'Expenses Count',          Value: data.expenses?.count || 0 },
        { Metric: 'Expenses Total',          Value: data.expenses?.total || 0 },
        { Metric: 'Purchases Count',         Value: data.purchases?.count || 0 },
        { Metric: 'Purchases Total',         Value: data.purchases?.total || 0 },
        { Metric: 'Cheques Count',           Value: data.cheques?.count || 0 },
        { Metric: 'Cheques Total',           Value: data.cheques?.total || 0 },
        { Metric: 'Net Profit',              Value: data.netProfit || 0 },
        { Metric: 'Low Stock Items',         Value: data.lowStock || 0 },
      ];
      const label = isMonthMode
        ? `${MONTH_NAMES[summaryMonth - 1]}_${summaryYear}`
        : `Today_${new Date().toISOString().slice(0, 10)}`;
      exportToExcel(rows, `Summary_${label}`, 'Summary');
    };

    return (
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isMonthMode
                ? `${MONTH_NAMES[summaryMonth - 1]} ${summaryYear} Summary`
                : "Today's Summary"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isMonthMode
                ? `${buildMonthRange(summaryYear, summaryMonth).start} → ${buildMonthRange(summaryYear, summaryMonth).end}`
                : new Date().toLocaleDateString('en-LK', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSummaryExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <FaFileExcel className="text-base" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={() => isMonthMode ? fetchMonthlySummary(summaryYear, summaryMonth) : fetchTodaySummary()}
              disabled={loading}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-60 shadow-sm"
            >
              {loading ? <Spinner /> : <FaSyncAlt className="text-sm" />}
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex gap-3">
            <button
              onClick={() => { setSummaryMode('today'); if (!todaySummary) fetchTodaySummary(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                summaryMode === 'today'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FaCalendarDay className="text-sm" />
              <span>Today</span>
            </button>
            <button
              onClick={() => {
                setSummaryMode('month');
                if (!monthlySummary) fetchMonthlySummary(summaryYear, summaryMonth);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                summaryMode === 'month'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FaCalendarAlt className="text-sm" />
              <span>Monthly</span>
            </button>
          </div>
          {summaryMode === 'month' && (
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Select month (last 4 months available):</p>
              <MonthSelector
                selectedYear={summaryYear}
                selectedMonth={summaryMonth}
                onChange={handleMonthChange}
              />
            </div>
          )}
        </div>

        {/* Data */}
        {loading && !data ? (
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-3 text-indigo-600">
              <Spinner />
              <p className="text-sm text-gray-500 font-medium">Loading summary...</p>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Main KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Cash Sales"   value={formatLKR(data.cashSales?.total || 0)}   sub={`${data.cashSales?.count || 0} bills`}   color="green"  icon={<FaMoneyBillWave className="text-xl" />}/>
              <KpiCard label="Credit Sales" value={formatLKR(data.creditSales?.total || 0)} sub={`${data.creditSales?.count || 0} bills`} color="blue"   icon={<FaReceipt className="text-xl" />}/>
              <KpiCard label="Expenses"     value={formatLKR(data.expenses?.total || 0)}    sub={`${data.expenses?.count || 0} records`}  color="red"    icon={<FaFileInvoiceDollar className="text-xl" />}/>
              <KpiCard
                label="Net Profit"
                value={formatLKR(data.netProfit || 0)}
                sub={(data.netProfit || 0) >= 0 ? 'Profitable' : 'Loss'}
                color={(data.netProfit || 0) >= 0 ? 'purple' : 'red'}
                icon={<FaChartLine className="text-xl" />}
              />
            </div>
            {/* Secondary KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Purchases"          value={formatLKR(data.purchases?.total || 0)}            sub={`${data.purchases?.count || 0} records`}  color="amber"  icon={<FaShoppingCart className="text-xl" />}/>
              <KpiCard label="Cheques"            value={formatLKR(data.cheques?.total || 0)}              sub={`${data.cheques?.count || 0} cheques`}    color="indigo" icon={<FaMoneyCheckAlt className="text-xl" />}/>
              <KpiCard label="Credit Outstanding" value={formatLKR(data.creditSales?.outstanding || 0)}   sub="Unpaid credit"                            color="red"    icon={<FaExclamationTriangle className="text-xl" />}/>
              <KpiCard label="Low Stock Items"    value={`${data.lowStock || 0} items`}                    sub="Needs attention"                          color={(data.lowStock || 0) > 0 ? 'red' : 'green'} icon={<FaBoxes className="text-xl" />}/>
            </div>

            {/* Cash discount row */}
            {data.cashSales?.discount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <FaTag className="text-lg" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Total Discounts Given</p>
                  <p className="text-lg font-bold text-amber-700">{formatLKR(data.cashSales.discount)}</p>
                </div>
              </div>
            )}

            {/* Daily breakdown table (monthly mode only) */}
            {isMonthMode && data.dailyBreakdown && data.dailyBreakdown.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-semibold text-gray-800 text-sm">Daily Cash Sales Breakdown</h3>
                  <button
                    onClick={() => {
                      const rows = data.dailyBreakdown.map(d => ({
                        Date: d.date,
                        'Bill Count': d.bill_count,
                        'Total (LKR)': parseFloat(d.total).toFixed(2)
                      }));
                      exportToExcel(rows, `Daily_Breakdown_${MONTH_NAMES[summaryMonth-1]}_${summaryYear}`, 'Daily');
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1.5"
                  >
                    <FaFileExcel className="text-sm" />
                    <span>Export</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Bills</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.dailyBreakdown.map((row) => (
                        <tr key={row.date} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{formatDate(row.date)}</td>
                          <td className="px-4 py-2 text-center">{row.bill_count}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-700">{formatLKR(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td className="px-4 py-2 font-bold text-gray-700">Total</td>
                        <td className="px-4 py-2 text-center font-bold">{data.dailyBreakdown.reduce((s,r) => s + r.bill_count, 0)}</td>
                        <td className="px-4 py-2 text-right font-black text-green-700">
                          {formatLKR(data.dailyBreakdown.reduce((s,r) => s + parseFloat(r.total), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState message="No summary data" hint="Click Refresh to load" />
        )}
      </div>
    );
  };

  // ── TAB: Sales Report ─────────────────────────────────────────────────────
  const renderSalesTab = () => {
    const bills = salesReport?.bills || [];
    const totals = salesReport?.totals || {};

    const applyMonth = (year, month) =>
      applyMonthToFilters(year, month, setSalesFilters, fetchSalesReport, salesFilters);

    const doExcel = () => {
      const rows = bills.map(b => ({
        'Bill #':         b.bill_number,
        'Date':           formatDate(b.created_at),
        'Time':           new Date(b.created_at).toLocaleTimeString('en-LK'),
        'Cashier':        b.cashier_name || '-',
        'Items':          b.item_count,
        'Subtotal (LKR)': parseFloat(b.grand_total + (b.total_discount || 0)).toFixed(2),
        'Discount (LKR)': parseFloat(b.total_discount || 0).toFixed(2),
        'Grand Total (LKR)': parseFloat(b.grand_total).toFixed(2),
        'Payment':        b.payment_method,
      }));
      exportToExcel(rows, 'Sales_Report', 'Sales');
    };

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">Sales Report</h2>
          <button onClick={doExcel} disabled={bills.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
            <FaFileExcel className="text-base" />
            <span>Export Excel</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
          {/* Quick month buttons */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Quick Month Select:</p>
            <MonthSelector
              selectedYear={0} selectedMonth={0}
              onChange={applyMonth}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input type="date" value={salesFilters.dateFrom}
                onChange={e => setSalesFilters({...salesFilters, dateFrom: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input type="date" value={salesFilters.dateTo}
                onChange={e => setSalesFilters({...salesFilters, dateTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
              <select value={salesFilters.paymentMethod}
                onChange={e => setSalesFilters({...salesFilters, paymentMethod: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">All</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cashier</label>
              <input type="text" value={salesFilters.cashier} placeholder="Search cashier..."
                onChange={e => setSalesFilters({...salesFilters, cashier: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => fetchSalesReport()} disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors flex items-center gap-2 shadow-sm">
              {loading ? <Spinner /> : <FaFilter className="text-xs" />}
              <span>Apply Filters</span>
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {bills.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Bills"    value={totals.totalBills || 0}               color="indigo" icon={<FaReceipt className="text-xl" />} />
            <KpiCard label="Total Revenue"  value={formatLKR(totals.totalRevenue || 0)}  color="green"  icon={<FaChartLine className="text-xl" />} />
            <KpiCard label="Cash Sales"     value={formatLKR(totals.cashSales || 0)}     color="blue"   icon={<FaCashRegister className="text-xl" />} />
            <KpiCard label="Discounts"      value={formatLKR(totals.totalDiscount || 0)} color="amber"  icon={<FaTag className="text-xl" />} />
          </div>
        )}

        {/* Table */}
        {bills.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Bill #</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Cashier</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Grand Total</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.map(bill => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{bill.bill_number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDateTime(bill.created_at)}</td>
                      <td className="px-4 py-3">{bill.cashier_name || '-'}</td>
                      <td className="px-4 py-3 text-center">{bill.item_count}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{formatLKR(bill.grand_total)}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{formatLKR(bill.total_discount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          bill.payment_method === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>{bill.payment_method}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-gray-700">Totals ({bills.length} bills)</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatLKR(totals.totalRevenue)}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{formatLKR(totals.totalDiscount)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : salesReport !== null ? (
          <EmptyState message="No sales records found" hint="Try a wider date range" />
        ) : null}
      </div>
    );
  };

  // ── TAB: Credit Sales Report ──────────────────────────────────────────────
  const renderCreditTab = () => {
    const bills = creditReport?.bills || [];
    const totals = creditReport?.totals || {};

    const applyMonth = (year, month) =>
      applyMonthToFilters(year, month, setCreditFilters, fetchCreditReport, creditFilters);

    const doExcel = () => {
      const rows = bills.map(b => ({
        'Bill #':             b.bill_number,
        'Customer':           b.customer_name || '-',
        'Mobile':             b.customer_mobile || '-',
        'Date':               formatDate(b.created_at),
        'Grand Total (LKR)':  parseFloat(b.grand_total).toFixed(2),
        'Paid (LKR)':         parseFloat(b.paid_amount || 0).toFixed(2),
        'Outstanding (LKR)':  parseFloat(b.outstanding_amount || 0).toFixed(2),
        'Status':             b.status,
        'Due Date':           b.due_date ? formatDate(b.due_date) : '-',
      }));
      exportToExcel(rows, 'Credit_Sales_Report', 'Credit Sales');
    };

    const statusBadge = (status) => {
      const map = {
        pending: 'bg-red-100 text-red-700',
        partial: 'bg-amber-100 text-amber-700',
        paid:    'bg-green-100 text-green-700',
      };
      return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-700';
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">Credit Sales Report</h2>
          <button onClick={doExcel} disabled={bills.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
            <FaFileExcel className="text-base" />
            <span>Export Excel</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Quick Month Select:</p>
            <MonthSelector selectedYear={0} selectedMonth={0} onChange={applyMonth} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input type="date" value={creditFilters.dateFrom}
                onChange={e => setCreditFilters({...creditFilters, dateFrom: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input type="date" value={creditFilters.dateTo}
                onChange={e => setCreditFilters({...creditFilters, dateTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={creditFilters.status}
                onChange={e => setCreditFilters({...creditFilters, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
              <input type="text" value={creditFilters.customer} placeholder="Name or mobile..."
                onChange={e => setCreditFilters({...creditFilters, customer: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => fetchCreditReport()} disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors flex items-center gap-2 shadow-sm">
              {loading ? <Spinner /> : <FaFilter className="text-xs" />}
              <span>Apply Filters</span>
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {bills.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Bills"      value={totals.totalBills || 0}                    color="indigo" icon={<FaReceipt className="text-xl" />} />
            <KpiCard label="Total Revenue"    value={formatLKR(totals.totalRevenue || 0)}        color="green"  icon={<FaChartLine className="text-xl" />} />
            <KpiCard label="Amount Paid"      value={formatLKR(totals.totalPaid || 0)}           color="blue"   icon={<FaMoneyBillWave className="text-xl" />} />
            <KpiCard label="Outstanding"      value={formatLKR(totals.totalOutstanding || 0)}    color="red"    icon={<FaExclamationTriangle className="text-xl" />} />
          </div>
        )}

        {bills.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Bill #</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Outstanding</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.map(bill => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{bill.bill_number}</td>
                      <td className="px-4 py-3 font-medium">{bill.customer_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{bill.customer_mobile || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(bill.created_at)}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatLKR(bill.grand_total)}</td>
                      <td className="px-4 py-3 text-right text-green-700">{formatLKR(bill.paid_amount || 0)}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-semibold">{formatLKR(bill.outstanding_amount || 0)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${statusBadge(bill.status)}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">{bill.due_date ? formatDate(bill.due_date) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-gray-700">Totals ({bills.length} bills)</td>
                    <td className="px-4 py-3 text-right">{formatLKR(totals.totalRevenue)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatLKR(totals.totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatLKR(totals.totalOutstanding)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : creditReport !== null ? (
          <EmptyState message="No credit sales found" hint="Try a wider date range or different status filter" />
        ) : null}
      </div>
    );
  };

  // ── TAB: Stock Report ─────────────────────────────────────────────────────
  const renderStockTab = () => {
    const products = stockReport?.products || [];
    const totals = stockReport?.totals || {};

    const doExcel = () => {
      const rows = products.map(p => ({
        'Barcode':            p.barcode || '-',
        'Item Name':          p.item_name,
        'Short Form':         p.short_form || '-',
        'Company':            p.company || '-',
        'Stock Qty':          p.stock_quantity,
        'Buying Price (LKR)': parseFloat(p.buying_price).toFixed(2),
        'Selling Price (LKR)':parseFloat(p.selling_price).toFixed(2),
        'Profit Margin (LKR)':parseFloat(p.profit_margin || 0).toFixed(2),
        'Stock Value (LKR)':  (p.buying_price * p.stock_quantity).toFixed(2),
        'Retail Value (LKR)': (p.selling_price * p.stock_quantity).toFixed(2),
        'Status':             p.stock_status,
      }));
      exportToExcel(rows, 'Stock_Report', 'Stock');
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">Stock Report</h2>
          <button onClick={doExcel} disabled={products.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
            <FaFileExcel className="text-base" />
            <span>Export Excel</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input type="text" value={stockFilters.search} placeholder="Name, barcode, company..."
                onChange={e => setStockFilters({...stockFilters, search: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
              <input type="text" value={stockFilters.company} placeholder="Filter by company..."
                onChange={e => setStockFilters({...stockFilters, company: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
              <select value={stockFilters.sortBy}
                onChange={e => setStockFilters({...stockFilters, sortBy: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="item_name">Name</option>
                <option value="stock_quantity">Stock Qty</option>
                <option value="buying_price">Buying Price</option>
                <option value="selling_price">Selling Price</option>
                <option value="company">Company</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={stockFilters.lowStockOnly}
                onChange={e => setStockFilters({...stockFilters, lowStockOnly: e.target.checked})}
                className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
              <span className="text-sm text-gray-700 font-medium flex items-center gap-1.5">
                <FaExclamationTriangle className="text-amber-500 text-xs" />
                <span>Low Stock Only (≤10)</span>
              </span>
            </label>
            <button onClick={() => fetchStockReport()} disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors flex items-center gap-2 shadow-sm">
              {loading ? <Spinner /> : <FaFilter className="text-xs" />}
              <span>Apply</span>
            </button>
          </div>
        </div>

        {/* Summary */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Products"   value={totals.totalProducts || 0}                  color="indigo" icon={<FaBox className="text-xl" />} />
            <KpiCard label="Stock Value"      value={formatLKR(totals.totalStockValue || 0)}      color="blue"   icon={<FaBoxes className="text-xl" />} />
            <KpiCard label="Retail Value"     value={formatLKR(totals.totalRetailValue || 0)}     color="green"  icon={<FaChartLine className="text-xl" />} />
            <KpiCard label="Low Stock"        value={`${totals.lowStockCount || 0} items`}        color={(totals.lowStockCount || 0) > 0 ? 'red' : 'green'} icon={<FaExclamationTriangle className="text-xl" />} />
          </div>
        )}

        {products.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Barcode</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Item Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Buy Price</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Sell Price</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Margin</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(p => {
                    const qty = p.stock_quantity;
                    const qtyColor = qty === 0 ? 'text-red-600' : qty <= 10 ? 'text-amber-600' : 'text-green-700';
                    const badgeColor = qty === 0 ? 'bg-red-100 text-red-700' : qty <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.barcode || '-'}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{p.item_name}</p>
                          {p.short_form && <p className="text-xs text-gray-400">{p.short_form}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.company || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-black text-base ${qtyColor}`}>{qty}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatLKR(p.buying_price)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatLKR(p.selling_price)}</td>
                        <td className="px-4 py-3 text-right text-green-700">{formatLKR(p.profit_margin || 0)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeColor}`}>{p.stock_status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : stockReport !== null ? (
          <EmptyState message="No products found" hint="Try adjusting your search" />
        ) : null}
      </div>
    );
  };

  // ── TAB: Expense Report ───────────────────────────────────────────────────
  const renderExpenseTab = () => {
    const expenses = expenseReport?.expenses || [];
    const totals = expenseReport?.totals || {};

    const applyMonth = (year, month) =>
      applyMonthToFilters(year, month, setExpenseFilters, fetchExpenseReport, expenseFilters);

    const doExcel = () => {
      const rows = expenses.map(e => ({
        'Date':            formatDate(e.expense_date),
        'Category':        e.category_name || '-',
        'Reason':          e.reason,
        'Amount (LKR)':    parseFloat(e.amount).toFixed(2),
        'Created By':      e.created_by_name || '-',
      }));
      exportToExcel(rows, 'Expense_Report', 'Expenses');
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">Expense Report</h2>
          <button onClick={doExcel} disabled={expenses.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
            <FaFileExcel className="text-base" />
            <span>Export Excel</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Quick Month Select:</p>
            <MonthSelector selectedYear={0} selectedMonth={0} onChange={applyMonth} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input type="date" value={expenseFilters.dateFrom}
                onChange={e => setExpenseFilters({...expenseFilters, dateFrom: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input type="date" value={expenseFilters.dateTo}
                onChange={e => setExpenseFilters({...expenseFilters, dateTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select value={expenseFilters.categoryId}
                onChange={e => setExpenseFilters({...expenseFilters, categoryId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">All Categories</option>
                {expenseCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => fetchExpenseReport()} disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors flex items-center gap-2 shadow-sm">
              {loading ? <Spinner /> : <FaFilter className="text-xs" />}
              <span>Apply Filters</span>
            </button>
          </div>
        </div>

        {/* Summary */}
        {expenses.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <KpiCard label="Total Expenses" value={totals.totalExpenses || 0}               color="indigo" icon={<FaReceipt className="text-xl" />} />
            <KpiCard label="Total Amount"   value={formatLKR(totals.totalAmount || 0)}       color="red"    icon={<FaFileInvoiceDollar className="text-xl" />} />
          </div>
        )}

        {expenses.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{formatDate(e.expense_date)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {e.category_name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{e.reason}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{formatLKR(e.amount)}</td>
                      <td className="px-4 py-3 text-gray-500">{e.created_by_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-gray-700">Total ({expenses.length} expenses)</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatLKR(totals.totalAmount)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : expenseReport !== null ? (
          <EmptyState message="No expenses found" hint="Try a wider date range or different category" />
        ) : null}
      </div>
    );
  };

  // ── TAB: Purchase Report ──────────────────────────────────────────────────
  const renderPurchaseTab = () => {
    const purchases = purchaseReport?.purchases || [];
    const totals = purchaseReport?.totals || {};

    const applyMonth = (year, month) =>
      applyMonthToFilters(year, month, setPurchaseFilters, fetchPurchaseReport, purchaseFilters);

    const doExcel = () => {
      const rows = purchases.map(p => ({
        'Date':              formatDate(p.purchase_date),
        'Supplier':          p.supplier_name || '-',
        'Reference #':       p.reference_number || '-',
        'Bill Type':         p.bill_type || '-',
        'Bill Amount (LKR)': parseFloat(p.bill_amount || 0).toFixed(2),
        'Paid (LKR)':        parseFloat(p.paid_amount || 0).toFixed(2),
        'Outstanding (LKR)': parseFloat(p.outstanding_amount || 0).toFixed(2),
        'Created By':        p.created_by_name || '-',
      }));
      exportToExcel(rows, 'Purchase_Report', 'Purchases');
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gray-900">Purchase Report</h2>
          <button onClick={doExcel} disabled={purchases.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
            <FaFileExcel className="text-base" />
            <span>Export Excel</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Quick Month Select:</p>
            <MonthSelector selectedYear={0} selectedMonth={0} onChange={applyMonth} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input type="date" value={purchaseFilters.dateFrom}
                onChange={e => setPurchaseFilters({...purchaseFilters, dateFrom: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input type="date" value={purchaseFilters.dateTo}
                onChange={e => setPurchaseFilters({...purchaseFilters, dateTo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bill Type</label>
              <select value={purchaseFilters.billType}
                onChange={e => setPurchaseFilters({...purchaseFilters, billType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">All Types</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => fetchPurchaseReport()} disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors flex items-center gap-2 shadow-sm">
              {loading ? <Spinner /> : <FaFilter className="text-xs" />}
              <span>Apply Filters</span>
            </button>
          </div>
        </div>

        {/* Summary */}
        {purchases.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Total Purchases"  value={totals.totalPurchases || 0}               color="indigo" icon={<FaShoppingCart className="text-xl" />} />
            <KpiCard label="Total Amount"     value={formatLKR(totals.totalAmount || 0)}        color="blue"   icon={<FaMoneyBillWave className="text-xl" />} />
            <KpiCard label="Outstanding"      value={formatLKR(totals.totalOutstanding || 0)}   color="red"    icon={<FaExclamationTriangle className="text-xl" />} />
          </div>
        )}

        {purchases.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ref #</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Outstanding</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{formatDate(p.purchase_date)}</td>
                      <td className="px-4 py-3 font-medium">{p.supplier_name || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.reference_number || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                          p.bill_type === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>{p.bill_type || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{formatLKR(p.bill_amount)}</td>
                      <td className="px-4 py-3 text-right text-green-700">{formatLKR(p.paid_amount || 0)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatLKR(p.outstanding_amount || 0)}</td>
                      <td className="px-4 py-3 text-gray-500">{p.created_by_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-gray-700">Total ({purchases.length})</td>
                    <td className="px-4 py-3 text-right">{formatLKR(totals.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatLKR((totals.totalAmount || 0) - (totals.totalOutstanding || 0))}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatLKR(totals.totalOutstanding)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : purchaseReport !== null ? (
          <EmptyState message="No purchases found" hint="Try a wider date range" />
        ) : null}
      </div>
    );
  };

  // ── Tab definitions ───────────────────────────────────────────────────────
  const TABS = [
    { key: 'today',     label: 'Summary',      icon: <FaChartPie className="text-base" />,          render: renderSummaryTab  },
    { key: 'sales',     label: 'Sales',        icon: <FaCashRegister className="text-base" />,      render: renderSalesTab    },
    { key: 'credit',    label: 'Credit Sales', icon: <FaReceipt className="text-base" />,           render: renderCreditTab   },
    { key: 'stock',     label: 'Stock',        icon: <FaBox className="text-base" />,               render: renderStockTab    },
    { key: 'expenses',  label: 'Expenses',     icon: <FaFileInvoiceDollar className="text-base" />, render: renderExpenseTab  },
    { key: 'purchases', label: 'Purchases',    icon: <FaShoppingCart className="text-base" />,      render: renderPurchaseTab },
  ];

  const activeTabDef = TABS.find(t => t.key === activeTab);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Page header */}
        <header className="bg-white shadow-sm border-b px-6 py-4 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              View and export business reports — today, monthly, or any date range
            </p>
          </div>
        </header>

        {/* Tab bar */}
        <div className="bg-white border-b px-6 overflow-x-auto flex-shrink-0">
          <div className="flex gap-1 min-w-max">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3.5 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className={activeTab === tab.key ? 'text-indigo-600' : 'text-gray-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {activeTabDef && activeTabDef.render()}
        </div>
      </main>
    </div>
  );
};

export default Reports;