import { Injectable } from '@nestjs/common';

type RemoveBackgroundFn = (input: Buffer | string | URL, options?: object) => Promise<Blob>;

@Injectable()
export class RemoveBackgroundService {
  private removeBackgroundFn: RemoveBackgroundFn | null = null;
  private loadAttempted = false;

  private async getRemoveBackground(): Promise<RemoveBackgroundFn> {
    if (this.removeBackgroundFn) return this.removeBackgroundFn;
    if (this.loadAttempted) {
      throw new Error('Background removal is not available in this environment.');
    }
    this.loadAttempted = true;
    try {
      const mod = await import('@imgly/background-removal-node');
      this.removeBackgroundFn = mod.removeBackground;
      return this.removeBackgroundFn;
    } catch {
      throw new Error('Background removal is not available in this environment.');
    }
  }

  async removeBackground(imageSrc: string): Promise<string> {
    let input: Buffer | string | URL;

    if (imageSrc.startsWith('data:')) {
      const base64 = imageSrc.replace(/^data:image\/\w+;base64,/, '');
      input = Buffer.from(base64, 'base64');
    } else if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      input = imageSrc;
    } else {
      input = imageSrc;
    }

    const removeBackground = await this.getRemoveBackground();
    const blob = await removeBackground(input, {
      model: 'medium',
      debug: false,
      output: {
        format: 'image/png',
        quality: 0.95,
      },
    });

    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mime = blob.type || 'image/png';
    return `data:${mime};base64,${base64}`;
  }
}
