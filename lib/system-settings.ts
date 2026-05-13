/**
 * System Settings Utility
 * Helper functions to check and enforce kill switches
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Check if a feature is enabled
 * Returns true if enabled or if setting doesn't exist (fail-open)
 */
export async function isFeatureEnabled(settingKey: string): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', settingKey)
      .single()
    
    if (error || !data) {
      // Fail-open: if setting doesn't exist, assume enabled
      console.log(`⚠️  Setting ${settingKey} not found, defaulting to enabled`)
      return true
    }
    
    return data.setting_value?.enabled ?? true
  } catch (error) {
    console.error(`Error checking feature ${settingKey}:`, error)
    // Fail-open on error
    return true
  }
}

/**
 * Check multiple features at once
 * Returns an object with feature keys and their enabled status
 */
export async function checkFeatures(settingKeys: string[]): Promise<Record<string, boolean>> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', settingKeys)
    
    if (error) {
      console.error('Error checking features:', error)
      // Fail-open: return all as enabled
      return settingKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
    }
    
    const result: Record<string, boolean> = {}
    settingKeys.forEach(key => {
      const setting = data?.find(s => s.setting_key === key)
      result[key] = setting?.setting_value?.enabled ?? true
    })
    
    return result
  } catch (error) {
    console.error('Error checking features:', error)
    // Fail-open on error
    return settingKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
  }
}

/**
 * Client-side hook to check if a feature is enabled
 * Use this in React components
 */
export async function checkFeatureClient(settingKey: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/system-settings/check?key=${settingKey}`)
    if (!response.ok) return true // Fail-open
    
    const data = await response.json()
    return data.enabled ?? true
  } catch (error) {
    console.error(`Error checking feature ${settingKey}:`, error)
    return true // Fail-open
  }
}
