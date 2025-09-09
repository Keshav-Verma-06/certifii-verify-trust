import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple password hashing using crypto.subtle
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password, salt)
  return computedHash === hash
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const hasUrl = Boolean(Deno.env.get('SUPABASE_URL'))
    const hasServiceKey = Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    console.log('[secure-auth] env check', { hasUrl, hasServiceKey })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Read the request body ONCE and reuse it
    const body = await req.json()
    const { action, email, password, userType } = body

    console.log('[secure-auth v2] request start', {
      action,
      userType,
      email,
      method: req.method,
    })

    if (action === 'login') {
      let credentialsTable = ''
      let profileRole = ''
      
      if (userType === 'admin') {
        credentialsTable = 'admin_credentials'
        profileRole = 'admin'
      } else if (userType === 'institution') {
        credentialsTable = 'institution_credentials'  
        profileRole = 'institution'
      } else {
        throw new Error('Invalid user type')
      }

      console.log('[secure-auth] login path', { credentialsTable, profileRole, email })

      // Check for account lockout
      const { data: credentials, error: credError } = await supabase
        .from(credentialsTable)
        .select('*')
        .eq('email', email)
        .single()

      if (credError || !credentials) {
        console.error('[secure-auth] credentials fetch failed or not found', { email, credError })
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if account is locked
      if (credentials.locked_until && new Date(credentials.locked_until) > new Date()) {
        console.log('Account locked for email:', email)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Account temporarily locked due to too many failed attempts' 
          }),
          { status: 423, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, credentials.salt, credentials.password_hash)
      console.log('[secure-auth] password verification', { email, isValidPassword })
      
      if (!isValidPassword) {
        // Increment login attempts
        const newAttempts = (credentials.login_attempts || 0) + 1
        const lockUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null

        await supabase
          .from(credentialsTable)
          .update({ 
            login_attempts: newAttempts,
            locked_until: lockUntil?.toISOString()
          })
          .eq('id', credentials.id)

        console.log(`Failed login attempt ${newAttempts}/5 for email:`, email)
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: lockUntil ? 
              'Too many failed attempts. Account locked for 15 minutes.' : 
              'Invalid credentials' 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Reset login attempts and update last login
      await supabase
        .from(credentialsTable)
        .update({ 
          login_attempts: 0,
          locked_until: null,
          last_login: new Date().toISOString()
        })
        .eq('id', credentials.id)

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', credentials.user_id)
        .single()

      if (profileError || !profile) {
        console.error('Profile not found for user_id:', credentials.user_id)
        return new Response(
          JSON.stringify({ success: false, error: 'User profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[secure-auth] login success', { userType, email })

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: {
            id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
            institution_name: profile.institution_name
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'signup' && userType === 'institution') {
      const { full_name, institution_name } = body

      console.log('[secure-auth] signup path (institution)', {
        email,
        hasPassword: Boolean(password),
        hasFullName: Boolean(full_name),
        hasInstitutionName: Boolean(institution_name)
      })

      if (!email || !password || !full_name || !institution_name) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Check if institution already exists (do not throw on 0 rows)
      const { data: existingProfile, error: existingErr } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (existingErr && existingErr.code !== 'PGRST116') { // ignore No Rows error
        console.error('[secure-auth] error checking existing profile', existingErr)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to validate email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existingProfile) {
        console.log('[secure-auth] email already registered', { email })
        return new Response(
          JSON.stringify({ success: false, error: 'Email already registered' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create user profile
      const userId = crypto.randomUUID()
      console.log('[secure-auth] inserting profile', { email, userId })
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          email: email,
          full_name: full_name,
          role: 'institution',
          institution_name: institution_name,
          is_verified: false
        })

      if (profileError) {
        console.error('[secure-auth] failed to create profile', profileError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create profile', details: profileError.message || profileError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create credentials
      const salt = crypto.randomUUID()
      const passwordHash = await hashPassword(password, salt)
      console.log('[secure-auth] inserting credentials', { email, userId })
      
      const { error: credError } = await supabase
        .from('institution_credentials')
        .insert({
          user_id: userId,
          email: email,
          password_hash: passwordHash,
          salt: salt
        })

      if (credError) {
        console.error('[secure-auth] failed to create credentials', credError)
        // Cleanup profile if credentials creation failed
        await supabase.from('profiles').delete().eq('user_id', userId)
        
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create credentials', details: credError.message || credError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('[secure-auth] signup success (institution)', { email, userId })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Account created successfully. Please contact admin for verification.' 
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[secure-auth] unhandled error', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: (error as any)?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})