import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uybpqysmvrprysxvqlbg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YnBxeXNtdnJwcnlzeHZxbGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjM5MDMsImV4cCI6MjA3NzMzOTkwM30.r_ug8U5JZ1eJUDoNLYNys2tfysnHTiqBe2u1XX7_N3A'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          code: string
          host_id: string
          status: 'waiting' | 'ready' | 'playing' | 'finished'
          max_players: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          host_id: string
          status?: 'waiting' | 'ready' | 'playing' | 'finished'
          max_players?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          host_id?: string
          status?: 'waiting' | 'ready' | 'playing' | 'finished'
          max_players?: number
          created_at?: string
          updated_at?: string
        }
      }
      room_players: {
        Row: {
          id: string
          room_id: string
          player_id: string
          player_name: string
          is_host: boolean
          is_ready: boolean
          color: 'red' | 'blue' | 'yellow' | 'green' | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          player_id: string
          player_name: string
          is_host?: boolean
          is_ready?: boolean
          color?: 'red' | 'blue' | 'yellow' | 'green' | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          player_id?: string
          player_name?: string
          is_host?: boolean
          is_ready?: boolean
          color?: 'red' | 'blue' | 'yellow' | 'green' | null
          created_at?: string
        }
      }
      games: {
        Row: {
          id: string
          room_id: string
          game_state: any
          current_player_index: number
          epoch: number
          phase: 'setup' | 'playing' | 'scoring' | 'finished'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          game_state: any
          current_player_index?: number
          epoch?: number
          phase?: 'setup' | 'playing' | 'scoring' | 'finished'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          game_state?: any
          current_player_index?: number
          epoch?: number
          phase?: 'setup' | 'playing' | 'scoring' | 'finished'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}