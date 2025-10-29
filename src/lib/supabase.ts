import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

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