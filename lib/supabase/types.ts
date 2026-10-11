export interface DbProject {
  id: string;
  serial_no: number;
  name: string;
  address: string | null;
  project_person: string | null;
  person_number: string | null;
  user_id: string | null;
  safety_key: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}
