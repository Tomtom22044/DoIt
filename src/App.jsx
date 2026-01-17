import { useState } from 'react';
import MainLayout from './layout/MainLayout';
import Dashboard from './components/features/Dashboard';
import Activities from './components/features/Activities';
import Rewards from './components/features/Rewards';
import AuthPage from './components/auth/AuthPage';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'activities':
        return <Activities />;
      case 'rewards':
        return <Rewards />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="animate-fade-in">
        {renderContent()}
      </div>
    </MainLayout>
  );
}

export default App;
