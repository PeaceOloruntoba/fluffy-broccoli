export type Bus = {
  id: string;
  school_id: string;
  name: string | null;
  plate_number: string | null;
  code: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type CreateBusRequest = {
  name?: string | null;
  plate_number?: string | null;
};

export type UpdateBusRequest = {
  name?: string | null;
  plate_number?: string | null;
};
