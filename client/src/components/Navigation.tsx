import React from 'react';
import { Button } from './ui/button';
import { Calendar, Users, CheckSquare, Plus, BarChart3 } from 'lucide-react';
import { useAuth } from './AuthContext';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const { isAdmin } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'book', label: 'Book Facility', icon: Plus },
    ...(isAdmin ? [
      { id: 'approvals', label: 'Pending Approvals', icon: CheckSquare },
      { id: 'manage', label: 'Manage Facilities', icon: Users }
    ] : [])
  ];

  return (
    <nav className="border-b bg-card">
      <div className="flex h-14 items-center px-4 md:px-6">
        <div className="flex space-x-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onTabChange(tab.id)}
                className="flex items-center space-x-2"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};