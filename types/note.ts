export interface Note {
  id: string;
  content: string;
  task_id: string | null;
  source_task_title: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateNoteInput = Pick<Note, "content"> & Partial<Pick<Note, "task_id">> & { add_to_clipboard?: boolean };
export type UpdateNoteInput = Partial<Pick<Note, "content" | "task_id">>;

export interface InitialTaskNote {
  content: string;
  add_to_clipboard: boolean;
}
