Add-Type -AssemblyName System.Drawing

# Compress hs.jpg
$img = [System.Drawing.Image]::FromFile('hs.jpg')
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq 'JPEG' }
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 80L)
$img.Save('hs_compressed.jpg', $encoder, $params)
$img.Dispose()

# Compress base.jpg
$img = [System.Drawing.Image]::FromFile('base.jpg')
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq 'JPEG' }
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 80L)
$img.Save('base_compressed.jpg', $encoder, $params)
$img.Dispose()

# For webp and svg, they are already compressed, but to reduce size, perhaps resize if needed, but skip for now
