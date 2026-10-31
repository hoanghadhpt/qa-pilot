import sharp from 'sharp';
import { BoundingBox } from './artifactManager';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class ImageAnnotator {
  public async annotateError(
    rawImagePath: string,
    outputImagePath: string,
    box: BoundingBox,
    errorLabel: string
  ): Promise<void> {
    const metadata = await sharp(rawImagePath).metadata();
    const imgWidth = metadata.width || 1280;
    const imgHeight = metadata.height || 800;

    const safeX = Math.max(8, Math.min(Math.round(box.x), imgWidth - 60));
    const safeY = Math.max(36, Math.min(Math.round(box.y), imgHeight - 40));
    const safeWidth = Math.max(40, Math.min(Math.round(box.width), imgWidth - safeX - 8));
    const safeHeight = Math.max(28, Math.min(Math.round(box.height), imgHeight - safeY - 8));

    const truncatedLabel =
      errorLabel.length > 68 ? `${errorLabel.slice(0, 65)}...` : errorLabel;
    const escapedLabel = escapeXml(truncatedLabel);
    const badgeWidth = Math.min(imgWidth - 16, Math.max(180, truncatedLabel.length * 7.5 + 24));
    const badgeX = Math.min(safeX, imgWidth - badgeWidth - 8);
    const badgeY = Math.max(6, safeY - 30);

    const svgOverlay = `
      <svg width="${imgWidth}" height="${imgHeight}" viewBox="0 0 ${imgWidth} ${imgHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="${safeX}"
          y="${safeY}"
          width="${safeWidth}"
          height="${safeHeight}"
          fill="rgba(239, 68, 68, 0.10)"
          stroke="#EF4444"
          stroke-width="3"
          stroke-dasharray="6"
          rx="4"
        />
        <rect
          x="${badgeX}"
          y="${badgeY}"
          width="${badgeWidth}"
          height="24"
          fill="#DC2626"
          rx="4"
        />
        <text
          x="${badgeX + 10}"
          y="${badgeY + 16}"
          fill="#FFFFFF"
          font-family="Arial, sans-serif"
          font-size="12"
          font-weight="bold"
        >${escapedLabel}</text>
      </svg>
    `;

    await sharp(rawImagePath)
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .png()
      .toFile(outputImagePath);
  }
}

export const imageAnnotator = new ImageAnnotator();

