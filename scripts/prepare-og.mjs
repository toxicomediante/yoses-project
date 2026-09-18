import sharp from 'sharp'

await sharp('public/og-image.png')
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: 84, progressive: true, mozjpeg: true })
  .toFile('public/og-image.jpg')

console.log('Generated public/og-image.jpg (1200x630)')
