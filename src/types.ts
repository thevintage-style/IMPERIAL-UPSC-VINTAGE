
export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  instamojo_url: string;
  is_active: boolean;
  highlight?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  plan_type: 'Free' | 'Imperial' | 'Expired' | string;
  subscription_expires_at?: string;
  rank?: string;
  study_goal?: string;
  avatar_id?: string;
  updated_at: string;
}
