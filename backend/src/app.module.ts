import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BusinessesModule } from './businesses/businesses.module';
import { MenusModule } from './menus/menus.module';
import { MenuItemsModule } from './menu-items/menu-items.module';
import { ScreensModule } from './screens/screens.module';
import { PublicModule } from './public/public.module';
import { SchedulesModule } from './schedules/schedules.module';
import { LanguagesModule } from './languages/languages.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';
import { TemplatesModule } from './templates/templates.module';
import { TemplateBlocksModule } from './template-blocks/template-blocks.module';
import { TemplateBlockContentsModule } from './template-block-contents/template-block-contents.module';
import { ScreenBlocksModule } from './screen-blocks/screen-blocks.module';
import { ScreenBlockContentsModule } from './screen-block-contents/screen-block-contents.module';
import { AITemplatesModule } from './ai-templates/ai-templates.module';
import { AiModule } from './ai/ai.module';
import { QrMenusModule } from './qr-menus/qr-menus.module';
import { MenuResolverModule } from './menu-resolver/menu-resolver.module';
import { ContentLibraryModule } from './content-library/content-library.module';
import { DatabaseModule } from './database/database.module';
import { HomeChannelsModule } from './home-channels/home-channels.module';
import { ContactInfoModule } from './contact-info/contact-info.module';
import { HowToUseContentModule } from './how-to-use-content/how-to-use-content.module';
import { RegistrationRequestsModule } from './registration-requests/registration-requests.module';
import { ReportsModule } from './reports/reports.module';
import { SupabaseOptionalModule } from './supabase/supabase-optional.module';
import { SettingsModule } from './settings/settings.module';
import { InvoiceLayoutModule } from './invoice-layout/invoice-layout.module';
import { SeedModule } from './seed/seed.module';

@Module({
  controllers: [AppController],
  imports: [
    SeedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      // Render: Secret File ile tek seferde .env yükleyebilirsiniz (ENV_FILE_PATH=/etc/secrets/env)
      envFilePath: process.env.ENV_FILE_PATH || '.env',
    }),
    DatabaseModule, // Local PostgreSQL (primary)
    SupabaseOptionalModule, // Optional Supabase (for future)
    AuthModule,
    BusinessesModule,
    UsersModule,
    MenusModule,
    MenuItemsModule,
    ScreensModule,
    PublicModule,
    SchedulesModule,
    LanguagesModule,
    PlansModule,
    SubscriptionsModule,
    TemplatesModule,
    TemplateBlocksModule,
    TemplateBlockContentsModule,
    ScreenBlocksModule,
    ScreenBlockContentsModule,
    AITemplatesModule,
    AiModule,
    QrMenusModule,
    MenuResolverModule,
    ContentLibraryModule,
    HomeChannelsModule,
    ContactInfoModule,
    HowToUseContentModule,
    RegistrationRequestsModule,
    ReportsModule,
    SettingsModule,
    InvoiceLayoutModule,
  ],
})
export class AppModule {}
