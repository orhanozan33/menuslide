import { IsArray, IsInt, Min, Max, ArrayMinSize, IsOptional } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateSystemTemplatesDto {
  /** Oluşturulacak şablonların blok sayıları (örn. [1, 2, 4, 6] = 1, 2, 4 ve 6 bloklu şablonlar) */
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(16, { each: true })
  block_counts: number[];

  /** Her blok sayısından kaç adet şablon oluşturulsun (varsayılan 1) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  count_per_type?: number;

  /** Blok birleştirme seçenekleri: { [blockCount]: ('left' | 'middle' | 'right')[] } — birden fazla seçilebilir */
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || typeof value !== 'object') return value;
    const result: Record<number, string[]> = {};
    const valid = ['left', 'middle', 'middle_left', 'middle_right', 'middle_2_as_one', 'right'];
    for (const [k, v] of Object.entries(value)) {
      const num = parseInt(String(k), 10);
      if (!isNaN(num) && num >= 1 && num <= 16 && Array.isArray(v)) {
        const arr = (v as unknown[]).filter((x): x is string => typeof x === 'string' && valid.includes(x));
        if (arr.length > 0) result[num] = arr;
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  })
  merge_options?: Record<number, string[]>;
}
