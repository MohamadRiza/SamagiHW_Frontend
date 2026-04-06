import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Unauthorized = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center p-8 bg-white rounded-xl shadow-lg">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">
          Sorry, <strong>{user?.username}</strong>. You don't have permission to access this page.
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            to="/dashboard" 
            className="btn-primary px-6 py-2"
          >
            Go to Dashboard
          </Link>
          <button 
            onClick={logout}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;