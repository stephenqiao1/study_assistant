export interface Module {
  id: string;
  module_title: string;
  started_at: string;
  details: {
    title: string;
    content: string;
    description?: string;
    available_tools?: string[];
  };
}

export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  module_id: string;
  tags: Tag[];
}

export interface StudySession {
  id: string;
  module_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string;
  status: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
  user_id: string;
} 