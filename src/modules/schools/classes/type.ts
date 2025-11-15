export type Class = {
  id: string;
  name: string;
  code: string;
  school_id: string;
  school_user_id: string;
  created_at: string;
  updated_at: string;
};

export type CreateClassRequest = {
  name: string;
  code: string;
};

export type ClassResponse = Omit<Class, 'school_user_id'>;
