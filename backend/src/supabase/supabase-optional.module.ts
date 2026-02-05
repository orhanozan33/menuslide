import { Module, Global, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Optional Supabase module - only loads if configured
 * Falls back gracefully if Supabase is not configured
 */
@Global()
@Module({
  providers: [
    {
      provide: 'SUPABASE_CLIENT',
      useFactory: (configService: ConfigService): SupabaseClient | null => {
        const supabaseUrl = configService.get<string>('SUPABASE_URL');
        const supabaseKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

        // Return null if not configured (local mode)
        if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase')) {
          return null;
        }

        try {
          return createClient(supabaseUrl, supabaseKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });
        } catch {
          return null;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: ['SUPABASE_CLIENT'],
})
export class SupabaseOptionalModule {}
