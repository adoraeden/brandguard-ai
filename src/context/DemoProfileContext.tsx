import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { UserProfile } from '../types';

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'usr-admin-1', name: 'Evelyn Voss', email: 'evelyn.voss@auracloud.tech',
    role: 'admin', title: 'VP Brand Governance & Compliance', avatarInitials: 'EV',
    department: 'Executive Governance',
  },
  {
    id: 'usr-rev-1', name: 'Marcus Chen', email: 'marcus.chen@auracloud.tech',
    role: 'reviewer', title: 'Director of Marketing Communications', avatarInitials: 'MC',
    department: 'Brand Communications',
  },
  {
    id: 'usr-rev-2', name: 'Devon Price', email: 'devon.price@auracloud.tech',
    role: 'reviewer', title: 'Lead Content Policy Reviewer', avatarInitials: 'DP',
    department: 'Editorial & Compliance',
  },
];

interface DemoProfileContextType {
  currentUser: UserProfile;
  selectDemoProfile: (userId: string) => void;
  hasEnteredDemo: boolean;
  enterDemo: () => void;
  returnToDemoPicker: () => void;
  isAdmin: boolean;
  isReviewer: boolean;
}

const DemoProfileContext = createContext<DemoProfileContextType | undefined>(undefined);

export const DemoProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const savedId = localStorage.getItem('brandguard_demo_profile_id');
      return DEMO_USERS.find(user => user.id === savedId) || DEMO_USERS[0];
    } catch {
      return DEMO_USERS[0];
    }
  });
  const [hasEnteredDemo, setHasEnteredDemo] = useState(() => {
    try {
      return localStorage.getItem('brandguard_demo_entered') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('brandguard_demo_profile_id', currentUser.id);
    } catch {
      // Storage is optional; it never gates workspace access.
    }
  }, [currentUser.id]);

  const enterDemo = () => {
    setHasEnteredDemo(true);
    try {
      localStorage.setItem('brandguard_demo_entered', 'true');
    } catch {
      // Storage is optional; the current session can still continue.
    }
  };

  const returnToDemoPicker = () => {
    setHasEnteredDemo(false);
    try {
      localStorage.removeItem('brandguard_demo_entered');
    } catch {
      // Storage is optional; the current session can still return to the picker.
    }
  };

  const value = useMemo(() => ({
    currentUser,
    selectDemoProfile: (userId: string) => {
      const selected = DEMO_USERS.find(user => user.id === userId);
      if (selected) setCurrentUser(selected);
    },
    hasEnteredDemo,
    enterDemo,
    returnToDemoPicker,
    isAdmin: currentUser.role === 'admin',
    isReviewer: currentUser.role === 'reviewer',
  }), [currentUser, hasEnteredDemo]);

  return <DemoProfileContext.Provider value={value}>{children}</DemoProfileContext.Provider>;
};

export const useDemoProfile = () => {
  const context = useContext(DemoProfileContext);
  if (!context) throw new Error('useDemoProfile must be used within DemoProfileProvider');
  return context;
};
