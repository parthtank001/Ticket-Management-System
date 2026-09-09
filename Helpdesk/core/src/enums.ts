export enum Role {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
}

export type UserRole = keyof typeof Role;
