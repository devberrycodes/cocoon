export type NoteColor = "cream" | "pink" | "sage";

export interface Note {
  id: string;
  content: string;
  color: NoteColor;
  task_id: string | null;
  source_task_title: string | null;
  created_at: string;
  updated_at: string;
  is_sample?: boolean;
}

export type CreateNoteInput = Pick<Note, "content"> & Partial<Pick<Note, "task_id" | "color">> & { add_to_clipboard?: boolean };
export type UpdateNoteInput = Partial<Pick<Note, "content" | "task_id" | "color">>;

export interface InitialTaskNote {
  content: string;
  add_to_clipboard: boolean;
}
