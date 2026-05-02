export type ArticleStatus = 'unread' | 'reading' | 'read' | 'archived'
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple'

export interface Article {
  id: string
  url: string
  title: string | null
  content: string | null
  excerpt: string | null
  author: string | null
  published_at: string | null
  reading_time: number | null
  image_url: string | null
  site_name: string | null
  status: ArticleStatus
  telegram_message_id: number | null
  tags: string[]
  is_favorite: boolean
  fetch_error: string | null
  fetched_at: string | null
  created_at: string
  updated_at: string
}

export interface Highlight {
  id: string
  article_id: string
  text: string
  start_offset: number
  end_offset: number
  color: HighlightColor
  note: string | null
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  article_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface AISummary {
  id: string
  article_id: string
  summary: string | null
  key_points: string[] | null
  insights: string | null
  model: string | null
  created_at: string
}

export interface ArticleWithMeta extends Article {
  highlight_count?: number
  note_count?: number
  ai_summary?: AISummary | null
}

export type CreateHighlightPayload = {
  text: string
  start_offset: number
  end_offset: number
  color?: HighlightColor
  note?: string
}

export type UpdateHighlightPayload = Partial<Pick<Highlight, 'color' | 'note'>>

export type CreateNotePayload = { content: string }
export type UpdateNotePayload = { content: string }

export interface TelegramUser {
  id: number
  first_name: string
  username?: string
}
