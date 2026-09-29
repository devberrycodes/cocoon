export interface Note {
  id: string;
  content: string;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateNoteInput = Pick<Note, "content"> & Partial<Pick<Note, "task_id">>;
export type UpdateNoteInput = Partial<CreateNoteInput>;
