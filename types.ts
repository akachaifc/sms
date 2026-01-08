
export type UserRole = 'Root' | 'Master' | 'Principal' | 'Teacher' | 'Bursar' | 'Registrar' | 'Nurse';

export interface AuditLog {
  id: string;
  operator_email: string;
  operator_name?: string;
  operator_id?: string;
  operator_type: 'System Operator' | 'School Administrator';
  action: string;
  metadata?: any;
  entity_id?: string;
  entity_type?: string;
  created_at: string;
}

export interface ResetRequest {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  table_source: 'system_operators' | 'teachers_registry';
  status: 'Pending' | 'Approved';
  created_at: string;
}

// Added SystemOperator interface to resolve error in SystemStaff.tsx
export interface SystemOperator {
  id: string;
  email: string;
  full_name?: string;
  role: 'Root' | 'Master' | 'Principal';
  needs_password_reset?: boolean;
  photo_url?: string;
  profile_photo_url?: string;
}

export interface Student {
  id: string;
  school_id: string;
  reg_no: string;
  registration_number?: string; // mapping alias
  admission_number?: string;
  uneb_index_number?: string;
  emis_number?: string;
  lin?: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  other_names?: string;
  gender?: 'Male' | 'Female';
  date_of_birth?: string;
  age?: number;
  nationality?: string;
  tribe?: string;
  religion?: string;
  disability_status?: boolean;
  disability_description?: string;
  district?: string;
  county?: string;
  subcounty?: string;
  parish?: string;
  village?: string;
  physical_address?: string;
  residence_status?: 'Day' | 'Boarding';
  class_id?: string;
  stream_id?: string;
  house_id?: string;
  combination?: string;
  optional_subjects?: string[];
  subsidiary_subjects?: string[];
  curriculum?: string;
  enrollment_status?: 'active' | 'suspended' | 'transferred' | 'completed';
  // Guardian 1
  guardian_full_name?: string;
  guardian_relationship?: string;
  guardian_phone_primary?: string;
  guardian_phone_secondary?: string;
  guardian_id_no?: string;
  guardian_occupation?: string;
  // Guardian 2
  guardian2_full_name?: string;
  guardian2_relationship?: string;
  guardian2_phone_primary?: string;
  guardian2_phone_secondary?: string;
  guardian2_id_no?: string;
  guardian2_occupation?: string;
  
  emergency_name?: string;
  emergency_phone?: string;
  total_fees?: number;
  fees_paid?: number;
  fees_balance?: number;
  bursary_status?: string;
  sponsor_name?: string;
  transport_required?: boolean;
  transport_route?: string;
  transport_fee?: number;
  pickup_point?: string;
  photo_url?: string;
  signature_url?: string;
  is_leader?: boolean;
  leadership_title?: string;
  leadership_expiry?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  medical_conditions?: string;
  allergies?: string;
  special_needs?: string;
  academic_year?: string;
  term?: string;
  ple_info?: any;
  uce_info?: any;
  aspirations?: string;
  custom_data?: Record<string, any>;
}

export const MASTER_REGISTRY_FIELDS = [
  // IDENTITY
  { key: 'full_name', label: 'Full Name (Auto-Generated)', category: 'Core Identity', required: true },
  { key: 'first_name', label: 'First Name', category: 'Core Identity' },
  { key: 'last_name', label: 'Surname', category: 'Core Identity' },
  { key: 'gender', label: 'Gender', category: 'Core Identity' },
  { key: 'date_of_birth', label: 'Date of Birth', category: 'Core Identity' },
  { key: 'nationality', label: 'Nationality', category: 'Core Identity' },
  // IDs
  { key: 'registration_number', label: 'Registration Number', category: 'Identifiers', required: true },
  { key: 'lin', label: 'LIN (Learner ID)', category: 'Identifiers' },
  // GEOGRAPHY
  { key: 'district', label: 'District', category: 'Geography' },
  { key: 'village', label: 'Village', category: 'Geography' },
  // GUARDIAN 1
  { key: 'guardian_full_name', label: 'G1 Full Name', category: 'Guardian 1' },
  { key: 'guardian_relationship', label: 'G1 Relationship', category: 'Guardian 1' },
  { key: 'guardian_phone_primary', label: 'G1 Primary Phone', category: 'Guardian 1' },
  { key: 'guardian_phone_secondary', label: 'G1 Secondary Phone', category: 'Guardian 1' },
  { key: 'guardian_id_no', label: 'G1 ID No', category: 'Guardian 1' },
  { key: 'guardian_occupation', label: 'G1 Occupation', category: 'Guardian 1' },
  // GUARDIAN 2
  { key: 'guardian2_full_name', label: 'G2 Full Name', category: 'Guardian 2' },
  { key: 'guardian2_relationship', label: 'G2 Relationship', category: 'Guardian 2' },
  { key: 'guardian2_phone_primary', label: 'G2 Primary Phone', category: 'Guardian 2' },
  { key: 'guardian2_phone_secondary', label: 'G2 Secondary Phone', category: 'Guardian 2' },
  { key: 'guardian2_id_no', label: 'G2 ID No', category: 'Guardian 2' },
  { key: 'guardian2_occupation', label: 'G2 Occupation', category: 'Guardian 2' },
  // FINANCIAL/OTHER
  { key: 'fees_balance', label: 'Fees Balance', category: 'Financial/Other' },
  { key: 'transport_required', label: 'Transport Mode', category: 'Financial/Other' },
  { key: 'optional_subjects', label: 'Optional Subjects', category: 'Financial/Other' },
  // ACADEMIC HISTORY MAPPER NODES
  { key: 'ple_total', label: 'PLE Total Aggregates', category: 'Primary School Background' },
  { key: 'uce_total', label: 'UCE Total Aggregates', category: 'O-Level Background' },
];

export interface School {
  id: string; 
  name: string;
  logo_url?: string;
  street: string;
  district: string;
  region: string;
  affiliation: 'Government' | 'Private' | 'Faith-Based';
  curriculum: 'National' | 'International' | 'Other';
  infrastructure_type: string;
  residence_type: 'Day Only' | 'Boarding Only' | 'Mixed';
  offered_levels: string[];
  email: string;
  website?: string;
  phone: string;
  status: 'Active' | 'Suspended' | 'Grace Period';
  subscription_expiry?: string;
  modules: {
    attendance: boolean;
    academic: boolean;
    discipline: boolean;
    welfare: boolean;
    financial: boolean;
    inventory: boolean;
    id_cards: boolean;
    extracurriculars: boolean;
  };
  settings: {
    po_box: string;
    gender_focus: 'Male' | 'Female' | 'Mixed';
    uses_houses: boolean;
    selected_exams?: string[];
    naming_convention?: 'Full Name' | 'Split Names';
    [key: string]: any;
  };
  created_at?: string;
}

export interface TeacherRegistry {
  id: string;
  school_id: string;
  system_id: string;
  full_name: string;
  email: string;
  phone_numbers: string[];
  category: 'Teaching' | 'Non-Teaching';
  levels_taught: string[];
  subjects_taught: any[]; // JSONB
  is_hod: boolean;
  hod_department?: string;
  additional_roles: Record<string, string>; // JSONB
  profile_photo_url?: string;
  needs_password_reset: boolean;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  role?: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  school_id: string;
  school_name?: string;
  description: string;
  amount: number;
  amount_in_words: string;
  line_items: LineItem[];
  due_date: string;
  status: 'Pending' | 'Paid' | 'Overdue' | 'Sent';
  physical_ref?: string;
  pdf_scan?: string;
  created_at?: string;
  schools?: { name: string };
}

export interface MasterSubject {
  id?: string;
  name: string;
  code: string;
  level: 'Primary' | 'O-Level' | 'A-Level';
  papers?: string[];
  short_forms?: string[];
  is_compulsory?: boolean;
}

export interface AcademicTerm {
  id: number;
  label: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  date?: string;
}

export interface AcademicHoliday {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
}

export interface ALevelCombination {
  id: string;
  code: string;
  principal_subject_codes: string[];
  subsidiaries: string[];
}

export type ExtracurricularCategory = 'Club' | 'Society' | 'Association' | 'Game' | 'Sport' | 'Other' | 'UNKNOWN';

export interface Extracurricular {
  name: string;
  category: ExtracurricularCategory;
}

export interface GlobalSettings {
  id: number;
  a_level_combinations: ALevelCombination[];
  terms: AcademicTerm[];
  holidays: AcademicHoliday[];
  exam_definitions: string[];
  global_extracurriculars: Extracurricular[];
}

export interface FAQArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  created_at?: string;
}

export interface SupportThread {
  id: string;
  school_id: string;
  school_name?: string;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
  schools?: { name: string };
}

export interface SupportMessage {
  id: string;
  thread_id: string;
  content: string;
  sender_role: 'Admin' | 'User';
  sender_id: string;
  is_read: boolean;
  created_at: string;
}

export interface SystemDiagnostics {
  todayLogins: number;
  weeklyLogins: number;
  totalRows: number;
  apiRequests24h: number;
  emailPayloads: number;
  smsPayloads: number;
  latencyMs: number;
  activeAdmins: number;
  activeStaff: number;
  activeParents: number;
  activeStudents: number;
  photosIntegrated: number;
  signaturesIntegrated: number;
}

// Added OverlayVariable interface to resolve error in DesignLab.tsx
export interface OverlayVariable {
  id: string;
  key: string;
  type: 'text' | 'photo' | 'signature' | 'barcode' | 'qr';
  side: 'front' | 'back';
  x: number;
  y: number;
  width: number;
  height: number;
  style: {
    fontSize: number;
    fontWeight: string;
    color: string;
    textAlign: string;
  };
  nx?: number;
  ny?: number;
}

// Added CanvasElement interface to resolve error in IDDesigner.tsx
export interface CanvasElement {
  id: string;
  type: 'text' | 'placeholder' | 'photo' | 'barcode' | 'qr' | 'signature' | 'officer_signature';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  color: string;
  barcodeConfig?: {
    fields: string[];
    format: 'PSV' | 'JSON';
  };
}

// Added IDTemplate interface to resolve error in DesignLab.tsx
export interface IDTemplate {
  id: string;
  school_id: string;
  name: string;
  type: 'ID' | 'Report' | 'Certificate';
  orientation: 'landscape' | 'portrait';
  overlay_data: {
    variables: OverlayVariable[];
    grid_mappings: any[];
  };
  design_data: {
    front: {
      backgroundUrl: string | null;
      dimensions?: { width: number; height: number };
    };
    back: {
      backgroundUrl: string | null;
      dimensions?: { width: number; height: number };
    };
  };
  pdf_base64?: string;
  is_active: boolean;
  created_at?: string;
}
