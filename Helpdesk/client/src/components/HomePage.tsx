import React from 'react';
import { AuthUser } from '../lib/auth-client';
import { TicketsPage } from './TicketsPage';

interface HomePageProps {
  user: AuthUser;
}

export const HomePage: React.FC<HomePageProps> = ({ user }) => {
  return <TicketsPage user={user} />;
};
