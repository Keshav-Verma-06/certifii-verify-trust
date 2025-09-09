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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, email, password, userType } = await req.json()
    
    console.log(`Secure auth request: ${action} for ${userType} user: ${email}`)

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

      // Check for account lockout
      const { data: credentials, error: credError } = await supabase
        .from(credentialsTable)
        .select('*')
        .eq('email', email)
        .single()

      if (credError || !credentials) {
        console.error('Invalid credentials for email:', email)
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

      console.log(`Successful login for ${userType} user:`, email)

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
      const { full_name, institution_name } = await req.json()
      
      // Check if institution already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single()

      if (existingProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email already registered' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create user profile
      const userId = crypto.randomUUID()
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
        console.error('Failed to create profile:', profileError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create credentials
      const salt = crypto.randomUUID()
      const passwordHash = await hashPassword(password, salt)
      
      const { error: credError } = await supabase
        .from('institution_credentials')
        .insert({
          user_id: userId,
          email: email,
          password_hash: passwordHash,
          salt: salt
        })

      if (credError) {
        console.error('Failed to create credentials:', credError)
        // Cleanup profile if credentials creation failed
        await supabase.from('profiles').delete().eq('user_id', userId)
        
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Successfully created institution account for:', email)

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
    console.error('Secure auth error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})