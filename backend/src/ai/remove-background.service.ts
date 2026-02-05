import { Injectable } from '@nestjs/common';
import { removeBackground } from '@imgly/background-removal-node';

@Injectable()
export class RemoveBackgroundService {
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
