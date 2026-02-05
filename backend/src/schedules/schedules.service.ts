import { Injectable, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  /**
   * Check if user has access to a screen
   */
  private async checkScreenAccess(screenId: string, userId: string, userRole: string) {
    if (userRole === 'super_admin') {
      return true;
    }

    const { data: screen } = await this.supabase
      .from('screens')
      .select('business_id')
      .eq('id', screenId)
      .single();

    if (!screen) {
      throw new NotFoundException('Screen not found');
    }

    const { data: user } = await this.supabase
      .from('users')
      .select('business_id')
      .eq('id', userId)
      .single();

    if (user?.business_id !== screen.business_id) {
      throw new ForbiddenException('Access denied');
    }
  }

  /**
   * Create a new menu schedule
   */
  async create(createScheduleDto: CreateScheduleDto, userId: string, userRole: string) {
    await this.checkScreenAccess(createScheduleDto.screen_id, userId, userRole);

    // Verify menu belongs to same business as screen
    const { data: screen } = await this.supabase
      .from('screens')
      .select('business_id')
      .eq('id', createScheduleDto.screen_id)
      .single();

    const { data: menu } = await this.supabase
      .from('menus')
      .select('business_id')
      .eq('id', createScheduleDto.menu_id)
      .single();

    if (!menu || menu.business_id !== screen.business_id) {
      throw new ForbiddenException('Menu and screen must belong to the same business');
    }

    const { data, error } = await this.supabase
      .from('menu_schedules')
      .insert(createScheduleDto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all schedules for a screen
   */
  async findByScreen(screenId: string, userId: string, userRole: string) {
    await this.checkScreenAccess(screenId, userId, userRole);

    const { data, error } = await this.supabase
      .from('menu_schedules')
      .select(`
        *,
        menus (
          id,
          name,
          description
        )
      `)
      .eq('screen_id', screenId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Update schedule
   */
  async update(id: string, updateScheduleDto: UpdateScheduleDto, userId: string, userRole: string) {
    const { data: schedule } = await this.supabase
      .from('menu_schedules')
      .select('screen_id')
      .eq('id', id)
      .single();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    await this.checkScreenAccess(schedule.screen_id, userId, userRole);

    const { data, error } = await this.supabase
      .from('menu_schedules')
      .update(updateScheduleDto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete schedule
   */
  async remove(id: string, userId: string, userRole: string) {
    const { data: schedule } = await this.supabase
      .from('menu_schedules')
      .select('screen_id')
      .eq('id', id)
      .single();

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    await this.checkScreenAccess(schedule.screen_id, userId, userRole);

    const { error } = await this.supabase
      .from('menu_schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Schedule deleted successfully' };
  }
}
