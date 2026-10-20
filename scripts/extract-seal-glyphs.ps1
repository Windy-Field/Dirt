Add-Type -AssemblyName System.Drawing

$fontPath = Join-Path $PSScriptRoot '..\assets\fonts\YiShanBeiZhuanTi.ttf'
$fonts = [System.Drawing.Text.PrivateFontCollection]::new()
$fonts.AddFontFile((Resolve-Path $fontPath))
$family = $fonts.Families[0]
$culture = [System.Globalization.CultureInfo]::InvariantCulture

function Format-Number([float]$value) {
  return $value.ToString('0.###', $culture)
}

function Get-GlyphPath([string]$character, [float]$centerX, [float]$centerY) {
  # 按比例缩放字形，使其适合印面中的单字区域
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $format = [System.Drawing.StringFormat]::GenericTypographic
  $format.FormatFlags = $format.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoClip
  $path.AddString($character, $family, 0, 100, [System.Drawing.PointF]::new(0, 0), $format)

  $bounds = $path.GetBounds()
  $scale = [Math]::Min(35 / $bounds.Width, 37 / $bounds.Height)
  $offsetX = $centerX - (($bounds.X + ($bounds.Width / 2)) * $scale)
  $offsetY = $centerY - (($bounds.Y + ($bounds.Height / 2)) * $scale)
  $matrix = [System.Drawing.Drawing2D.Matrix]::new($scale, 0, 0, $scale, $offsetX, $offsetY)
  $path.Transform($matrix)

  $points = $path.PathPoints
  $types = $path.PathTypes
  $commands = [System.Collections.Generic.List[string]]::new()
  $index = 0
  while ($index -lt $points.Length) {
    # 低三位表示线段类型，最高位表示路径闭合
    $kind = $types[$index] -band 7
    $closed = ($types[$index] -band 128) -ne 0
    if ($kind -eq 0) {
      $commands.Add("M$(Format-Number $points[$index].X),$(Format-Number $points[$index].Y)")
      $index += 1
      continue
    }
    if ($kind -eq 1) {
      $commands.Add("L$(Format-Number $points[$index].X),$(Format-Number $points[$index].Y)")
      if ($closed) { $commands.Add('Z') }
      $index += 1
      continue
    }
    if ($kind -eq 3 -and $index + 2 -lt $points.Length) {
      $commands.Add("C$(Format-Number $points[$index].X),$(Format-Number $points[$index].Y) $(Format-Number $points[$index + 1].X),$(Format-Number $points[$index + 1].Y) $(Format-Number $points[$index + 2].X),$(Format-Number $points[$index + 2].Y)")
      if (($types[$index + 2] -band 128) -ne 0) { $commands.Add('Z') }
      $index += 3
      continue
    }
    throw "Unsupported path point type $kind at index $index"
  }

  $path.Dispose()
  $matrix.Dispose()
  return ($commands -join ' ')
}

$glyphs = @(
  @{ Name = 'ni'; Character = '泥'; X = 122; Y = 78.5 },
  @{ Name = 'yun'; Character = '云'; X = 122; Y = 121.5 },
  @{ Name = 'zhi'; Character = '智'; X = 78; Y = 78.5 },
  @{ Name = 'tan'; Character = '探'; X = 78; Y = 121.5 }
)

$pathMap = [ordered]@{}
foreach ($glyph in $glyphs) {
  $pathMap[$glyph.Name] = Get-GlyphPath $glyph.Character $glyph.X $glyph.Y
}

$json = $pathMap | ConvertTo-Json -Compress
$outputPath = Join-Path $PSScriptRoot '..\js\seal-glyph-paths.js'
$javascript = @'
(function registerSealGlyphs() {
  "use strict";

  const paths = __PATH_DATA__;
  const namespace = "http://www.w3.org/2000/svg";

  window.NiyunSealGlyphs = {
    render(target) {
      if (!target || target.childElementCount) return;
      const names = ["ni", "yun", "zhi", "tan"];
      for (let index = 0; index < names.length; index += 1) {
        const name = names[index];
        const glyph = document.createElementNS(namespace, "path");
        glyph.setAttribute("class", `seal-inscription-glyph glyph-${name}`);
        glyph.setAttribute("d", paths[name]);
        target.appendChild(glyph);
      }
    }
  };

  function renderSealInscriptions() {
    const targets = document.querySelectorAll(".seal-inscription");
    for (let index = 0; index < targets.length; index += 1) {
      window.NiyunSealGlyphs.render(targets[index]);
    }
  }

  renderSealInscriptions();
}());
'@.Replace('__PATH_DATA__', $json)
[System.IO.File]::WriteAllText($outputPath, $javascript, [System.Text.UTF8Encoding]::new($false))
$fonts.Dispose()
