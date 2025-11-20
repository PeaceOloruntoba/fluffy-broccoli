export type Parent = {
  id: string;
  user_id: string;
  school_id: string;
  parent_code: string | null;
  fullname: string | null;
  phone_number: string | null;
  nin: string | null;
  relationship: 'Father'|'Mother'|'Aunty'|'Uncle' | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type CreateParentRequest = {
  fullname: string;
  phonenumber: string;
  nin?: string | null;
  relationship: 'Father'|'Mother'|'Aunty'|'Uncle';
  email: string;
  password: string;
};

export type UpdateParentRequest = {
  fullname?: string | null;
  phonenumber?: string | null;
  nin?: string | null;
  relationship?: 'Father'|'Mother'|'Aunty'|'Uncle' | null;
  address?: string | null;
};
