const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');

async function buildFavicons() {
  const root = path.resolve(__dirname, '..');
  const branding = path.join(root, 'assets/branding');
  const source = await fs.readFile(path.join(branding, 'favicon.svg'));
  const sizes = [16, 32, 48];
  const imagePromises = [];
  for (let index = 0; index < sizes.length; index += 1) {
    const size = sizes[index];
    imagePromises.push(sharp(source, { density: 384 }).resize(size, size).png().toBuffer());
  }
  const images = await Promise.all(imagePromises);
  await fs.writeFile(path.join(branding, 'favicon-16x16.png'), images[0]);
  await fs.writeFile(path.join(branding, 'favicon-32x32.png'), images[1]);
  await sharp(source, { density: 384 }).resize(180, 180).flatten({ background: '#ad342b' })
    .png().toFile(path.join(branding, 'apple-touch-icon.png'));

  // ICO directory entries point to embedded PNG images, one per native size.
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  for (let index = 0; index < sizes.length; index += 1) {
    const size = sizes[index];
    const entry = 6 + index * 16;
    header[entry] = size;
    header[entry + 1] = size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(images[index].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += images[index].length;
  }
  const iconParts = [header];
  for (let index = 0; index < images.length; index += 1) {
    iconParts.push(images[index]);
  }
  await fs.writeFile(path.join(root, 'favicon.ico'), Buffer.concat(iconParts));
  console.log('Generated SVG-derived PNG, Apple touch icon and multi-size ICO.');
}

buildFavicons().catch(function reportIconBuildFailure(error) {
  console.error(error.message);
  process.exitCode = 1;
});
