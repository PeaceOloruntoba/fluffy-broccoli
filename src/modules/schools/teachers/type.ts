export type Teacher = {
  id: string;
  user_id: string;
  school_id: string;
  teacher_code: string | null;
  name: string | null;
  nin: string | null;
  gender: 'male' | 'female' | null;
  dob: string | null;
  nationality: string | null;
  state_of_origin: string | null;
  phone: string | null;
  passport_photo_url: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type CreateTeacherRequest = {
  name: string;
  email: string;
  password: string;
  nin?: string | null;
  gender: 'male' | 'female';
  dob?: string | null;
  nationality?: string | null;
  state_of_origin?: string | null;
  phone?: string | null;
};

export type UpdateTeacherRequest = {
  name?: string | null;
  nin?: string | null;
  gender?: 'male' | 'female' | null;
  dob?: string | null;
  nationality?: string | null;
  state_of_origin?: string | null;
  phone?: string | null;
};
