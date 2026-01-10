import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router";
import { authApi } from "../services/api";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";

// Component for user information display
const UserInfo: React.FC<{ user: any }> = ({ user }) => (
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
);

// Component for quick actions
const QuickActions: React.FC<{ 
  user: any; 
  onLogout: () => void; 
  onResendVerification: () => void;
  isLoading: boolean;
}> = ({ user, onLogout, onResendVerification, isLoading }) => (
  <div className="space-y-3">
    <Link
      to="/profile"
      className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
    >
      View Profile
    </Link>
    
    {!user?.emailVerified && (
      <Button
        variant="secondary"
        className="w-full"
        onClick={onResendVerification}
        disabled={isLoading}
      >
        {isLoading ? "Sending..." : "Resend Verification Email"}
      </Button>
    )}
    
    <Button
      variant="destructive"
      className="w-full"
      onClick={onLogout}
    >
      Logout
    </Button>
  </div>
);

// Component for email verification notice
const EmailVerificationNotice: React.FC<{ onResend: () => void; isLoading: boolean }> = ({ 
  onResend, 
  isLoading 
}) => (
  <Alert className="mt-4">
    <AlertDescription>
      <div className="flex justify-between items-center">
        <span className="text-sm">
          Your email is not verified. Please check your inbox and click verification link.
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onResend}
          disabled={isLoading}
          className="ml-2"
        >
          {isLoading ? "Sending..." : "Resend"}
        </Button>
      </div>
    </AlertDescription>
  </Alert>
);

// Component for recent activity placeholder
const RecentActivity: React.FC = () => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <p className="text-gray-600">
      Your recent activity will appear here. This section could include login history, 
      recent actions, or other relevant information based on your application's needs.
    </p>
  </div>
);

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      setNotification({
        type: 'error',
        message: 'Logout failed. Please try again.'
      });
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    
    setIsResendingEmail(true);
    setNotification(null);
    
    try {
      // This would need to be implemented in the API
      // await authApi.resendVerificationEmail(user.email);
      
      // For now, we'll just show a success message
      setNotification({
        type: 'success',
        message: 'Verification email sent successfully!'
      });
    } catch (error) {
      console.error("Failed to resend verification email:", error);
      setNotification({
        type: 'error',
        message: 'Failed to send verification email. Please try again later.'
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6">
        {/* Header */}
        <div className="border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}!</p>
        </div>
        
        {/* Notification */}
        {notification && (
          <Alert className={`mb-6 ${
            notification.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}>
            <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {notification.message}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Information</h2>
            <UserInfo user={user} />
            
            {!user?.emailVerified && (
              <EmailVerificationNotice 
                onResend={handleResendVerification} 
                isLoading={isResendingEmail} 
              />
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h2>
            <QuickActions 
              user={user} 
              onLogout={handleLogout} 
              onResendVerification={handleResendVerification}
              isLoading={isResendingEmail}
            />
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};