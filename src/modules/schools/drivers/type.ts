export type Driver = {
  id: string;
  user_id: string;
  school_id: string;
  code: string | null;
  name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type CreateDriverRequest = {
  name: string;
  email: string;
  phone?: string | null;
};

export type UpdateDriverRequest = {
  name?: string | null;
  phone?: string | null;
};
