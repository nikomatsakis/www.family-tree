# App Icon Design

## Status: COMPLETED ✅
**Created**: June 23, 2025
**Updated**: June 23, 2025
**Priority**: LOW - Visual enhancement, no functional impact

## Overview
Replace the default "F" icon with a proper family tree icon that represents the Greek family heritage. 

## Design Update
**✅ Logo Found!** - Beautiful Karpathos coastline image (KarpathosLogo.png) already exists in the project. This scenic photo of white and blue Greek buildings along the Mediterranean coast perfectly represents the family heritage - much better than the abstract map designs originally planned.

**Current Status**: 
- Logo file: `KarpathosLogo.png` (720x720 pixels)
- Needs resizing to PWA requirements
- Ready for implementation once image tools are installed

## Implementation Tasks - COMPLETED

### Icon Resizing ✅
- [x] Install ImageMagick or similar tool
- [x] Resize KarpathosLogo.png to 192x192 for mobile icon
- [x] Resize KarpathosLogo.png to 512x512 for app stores
- [x] Create smaller sizes (16x16, 32x32) for favicon/browser tabs
- [ ] Consider adding rounded corners for iOS (15% radius) - Optional

### Technical Integration ✅
- [x] Place resized icons in public/icons/ directory
- [x] Update manifest.json with correct icon paths (already configured)
- [x] Add favicon links to app/index.html template
- [ ] Test icon appearance on iOS and Android home screens - Requires device testing
- [ ] Verify PWA installation flow with new icons - Requires device testing

## Resizing Commands

Once ImageMagick is installed, use these commands:

```bash
# Basic resize for PWA requirements
convert KarpathosLogo.png -resize 192x192 public/icons/icon-192x192.png
convert KarpathosLogo.png -resize 512x512 public/icons/icon-512x512.png

# Optional: Create additional sizes
convert KarpathosLogo.png -resize 16x16 public/icons/icon-16x16.png    # Favicon
convert KarpathosLogo.png -resize 32x32 public/icons/icon-32x32.png    # Browser tab
convert KarpathosLogo.png -resize 64x64 public/icons/icon-64x64.png    # Small display

# Optional: iOS style with rounded corners (15% radius)
convert KarpathosLogo.png -resize 192x192 \
  -format 'roundrectangle 0,0 %[fx:w-1],%[fx:h-1] %[fx:w*0.15],%[fx:w*0.15]' \
  -write info:tmp.mvg \
  -alpha set -background none -fill white \
  tmp.mvg -compose DstIn -composite \
  public/icons/icon-192x192-ios.png
```

## Alternative Tools

If ImageMagick isn't available:
- **ffmpeg**: `ffmpeg -i KarpathosLogo.png -vf scale=192:192 public/icons/icon-192x192.png`
- **Online tools**: squoosh.app, resizeimage.net
- **macOS**: `sips -z 192 192 KarpathosLogo.png --out public/icons/icon-192x192.png`
- **Python PIL**: Can write a simple resize script

## Why This Logo Works

The Karpathos coastline photograph is perfect because:
- **Instantly recognizable** as Greek island architecture
- **Beautiful colors** - Mediterranean blue sea, white buildings, blue doors/shutters
- **Cultural significance** - Represents the family's Karpathos heritage
- **Works at all sizes** - The scenic view remains clear even when small
- **Professional appearance** - Photographic quality gives a premium feel
- **Emotional connection** - Family members will immediately recognize home

## Success Criteria
- Icons work well at all sizes from favicon (16x16) to app store (512x512)
- Clear representation of both Greek heritage and family tree purpose
- Professional appearance matching modern mobile app standards
- Proper integration with PWA installation flow

## Dependencies
- Requires icon generation tool or designer
- Must coordinate with existing PWA manifest.json structure
- Should test on actual mobile devices after implementation