import React from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router";

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}!</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Information</h2>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-500">Name:</span>
                <p className="text-gray-900">{user?.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Email:</span>
                <p className="text-gray-900">{user?.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Email Status:</span>
                <p className={user?.emailVerified ? "text-green-600" : "text-yellow-600"}>
                  {user?.emailVerified ? "Verified" : "Not Verified"}
                </p>
              </div>
            </div>
            
            {!user?.emailVerified && (
              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                <p className="text-sm">
                  Your email is not verified. Please check your inbox and click the verification link.
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/profile"
                className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                View Profile
              </Link>
              
              {!user?.emailVerified && (
                <button
                  className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                  onClick={() => {
                    // Resend verification email functionality could be added here
                    alert("Verification email resend functionality would be implemented here");
                  }}
                >
                  Resend Verification Email
                </button>
              )}
              
              <button
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">
              Your recent activity will appear here. This section could include login history, 
              recent actions, or other relevant information based on your application's needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};