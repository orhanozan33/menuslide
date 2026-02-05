import { Injectable } from '@nestjs/common';
import { ContentLibraryLocalService } from './content-library-local.service';
import { CreateContentLibraryItemDto } from './dto/create-content-library-item.dto';
import { UpdateContentLibraryItemDto } from './dto/update-content-library-item.dto';

@Injectable()
export class ContentLibraryService {
  constructor(private localService: ContentLibraryLocalService) {}

  create(createDto: CreateContentLibraryItemDto, uploadedBy?: string) {
    return this.localService.create(createDto, uploadedBy);
  }

  findUserUploads() {
    return this.localService.findUserUploads();
  }

  findMyUploads(userId: string) {
    return this.localService.findMyUploads(userId);
  }

  findAll(category?: string, type?: string) {
    return this.localService.findAll(category, type);
  }

  findAllGrouped() {
    return this.localService.findAllGrouped();
  }

  findOne(id: string) {
    return this.localService.findOne(id);
  }

  update(id: string, updateDto: UpdateContentLibraryItemDto) {
    return this.localService.update(id, updateDto);
  }

  remove(id: string) {
    return this.localService.remove(id);
  }

  removeDuplicatesByName() {
    return this.localService.removeDuplicatesByName();
  }

  reorder(updates: { id: string; display_order: number }[]) {
    return this.localService.reorder(updates);
  }

  findAllCategories(activeOnly?: boolean) {
    return this.localService.findAllCategories(activeOnly);
  }

  findOneCategory(id: string) {
    return this.localService.findOneCategory(id);
  }

  createCategory(data: { slug: string; label: string; icon?: string; display_order?: number }) {
    return this.localService.createCategory(data);
  }

  updateCategory(id: string, data: { slug?: string; label?: string; icon?: string; display_order?: number }) {
    return this.localService.updateCategory(id, data);
  }

  deleteCategory(id: string) {
    return this.localService.deleteCategory(id);
  }

  reorderCategories(updates: { id: string; display_order: number }[]) {
    return this.localService.reorderCategories(updates);
  }

}
