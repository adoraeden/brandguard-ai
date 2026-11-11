
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

import { UserProfile, UserRole } from '../types';

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'usr-admin-1',
    name: 'Evelyn Voss',
    email: 'evelyn.voss@auracloud.tech',
    role: 'admin',
    title: 'VP Brand Governance & Compliance',
    avatarInitials: 'EV',
    department: 'Executive Governance',
  },
  {
    id: 'usr-rev-1',
    name: 'Marcus Chen',
    email: 'marcus.chen@auracloud.tech',
    role: 'reviewer',
    title: 'Director of Marketing Communications',
    avatarInitials: 'MC',
    department: 'Brand Communications',
  },
  {
    id: 'usr-rev-2',
    name: 'Devon Price',
    email: 'devon.price@auracloud.tech',
    role: 'reviewer',
    title: 'Lead Content Policy Reviewer',
    avatarInitials: 'DP',
    department: 'Editorial & Compliance',
  },
];

interface AuthContextType {
  currentUser: UserProfile;
  loginAs: (user: UserProfile) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  isAdmin: boolean;
  isReviewer: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('brandguard_current_user');

      if (saved) {
        const parsed = JSON.parse(saved) as UserProfile;

        const validUser = DEMO_USERS.find(
          (user) => user.id === parsed.id
        );

        if (validUser) {
          return validUser;
        }
      }
    } catch {
      // Use the default demo user if saved data is invalid.
    }

    return DEMO_USERS[0];
  });

  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        'brandguard_current_user',
        JSON.stringify(currentUser)
      );
    } catch {
      // Ignore localStorage errors.
    }
  }, [currentUser]);

  const loginAs = (user: UserProfile) => {
    setCurrentUser(user);
    setShowAuthModal(false);
  };

  const logout = () => {
    localStorage.removeItem('brandguard_current_user');
    setShowAuthModal(true);
  };

  const switchRole = (role: UserRole) => {
    const target =
      DEMO_USERS.find((user) => user.role === role) || DEMO_USERS[0];

    loginAs(target);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loginAs,
        logout,
        switchRole,
        isAdmin: currentUser.role === 'admin',
        isReviewer: currentUser.role === 'reviewer',
        showAuthModal,
        setShowAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
