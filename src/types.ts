export interface Module {
  id: string;
  label: string;
  description: string;
  emoji: string;
  color: string;      // Tailwind accent class prefix (e.g. 'indigo')
  bgDark: string;     // dark bg class
  borderDark: string; // dark border class
  route: string;
  available: boolean;
}

export interface HubUser {
  id: string;
  email: string;
  name: string;
}
