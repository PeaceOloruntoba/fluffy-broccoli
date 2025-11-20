export type Student = {
  id: string;
  school_id: string;
  name: string;
  reg_no: string | null;
  class_id: string | null;
  parent_id: string | null; // refers to users.id of parent
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type CreateStudentRequest = {
  name: string;
  reg_no?: string | null;
  class_id?: string | null;
  parent_id?: string | null; // users.id
};

export type UpdateStudentRequest = {
  name?: string | null;
  reg_no?: string | null;
  class_id?: string | null;
  parent_id?: string | null; // users.id
};
