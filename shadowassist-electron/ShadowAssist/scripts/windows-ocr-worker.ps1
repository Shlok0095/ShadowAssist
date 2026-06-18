# windows-ocr-worker.ps1
# Persistent Windows.Media.Ocr worker process.
# Loads WinRT OCR engine once on startup; subsequent calls are fast (~50-150ms).
#
# Protocol (newline-delimited over stdin/stdout):
#   stdin:  "path:<absolute-path-to-temp-png>"
#           "EXIT"
#   stdout: "READY"            (emitted once after successful init)
#           "FATAL:<message>"  (init failed — process exits after this)
#           "OK:<base64-utf8>" (OCR succeeded — decoded text)
#           "ERR:<message>"    (OCR failed for this image)

[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ── Load WinRT type projections ───────────────────────────────────────────────
# Assembly names match the WinMD filenames in %SystemRoot%\System32\WinMetadata\
#   Windows.Graphics.winmd  → Windows.Graphics.Imaging.*
#   Windows.Media.winmd     → Windows.Media.Ocr.*
#   Windows.Globalization.winmd → Windows.Globalization.*
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime

    $null = [Windows.Graphics.Imaging.BitmapDecoder,     Windows.Graphics,      ContentType = WindowsRuntime]
    $null = [Windows.Graphics.Imaging.SoftwareBitmap,    Windows.Graphics,      ContentType = WindowsRuntime]
    $null = [Windows.Graphics.Imaging.BitmapPixelFormat, Windows.Graphics,      ContentType = WindowsRuntime]
    $null = [Windows.Media.Ocr.OcrEngine,                Windows.Media,         ContentType = WindowsRuntime]
    $null = [Windows.Media.Ocr.OcrResult,                Windows.Media,         ContentType = WindowsRuntime]
    $null = [Windows.Globalization.Language,              Windows.Globalization, ContentType = WindowsRuntime]
} catch {
    [Console]::Out.WriteLine('FATAL:WinRT load failed: ' + $_.Exception.Message)
    [Console]::Out.Flush()
    exit 1
}

# ── Async helper (reflection-based AsTask<T>) ─────────────────────────────────
$_asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 } |
    Select-Object -First 1

if ($null -eq $_asTask) {
    [Console]::Out.WriteLine('FATAL:AsTask reflection failed — System.Runtime.WindowsRuntime not available')
    [Console]::Out.Flush()
    exit 1
}

function Await-WinRT([object]$AsyncOp, [Type]$T) {
    $task = $_asTask.MakeGenericMethod($T).Invoke($null, @($AsyncOp))
    $task.Wait(-1) | Out-Null
    return $task.Result
}

# ── Create OCR engine ─────────────────────────────────────────────────────────
try {
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if ($null -eq $engine) {
        # Fallback: force English if no profile language pack is installed
        $lang   = [Windows.Globalization.Language]::new('en-US')
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
    }
    if ($null -eq $engine) {
        [Console]::Out.WriteLine('FATAL:Cannot create Windows OCR engine. Install an OCR language pack: Windows Settings > Time & Language > Language > your language > Options > Download under OCR.')
        [Console]::Out.Flush()
        exit 1
    }
} catch {
    [Console]::Out.WriteLine('FATAL:OCR engine init: ' + $_.Exception.Message)
    [Console]::Out.Flush()
    exit 1
}

[Console]::Out.WriteLine('READY')
[Console]::Out.Flush()

# ── Request loop ──────────────────────────────────────────────────────────────
while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    $line = $line.Trim()
    if ($line -eq '')     { continue }
    if ($line -eq 'EXIT') { break }

    if (-not $line.StartsWith('path:')) {
        [Console]::Out.WriteLine('ERR:unknown command')
        [Console]::Out.Flush()
        continue
    }

    $filePath = $line.Substring(5)
    $fs  = $null
    $bmp = $null

    try {
        # Decode PNG → SoftwareBitmap
        $fs      = [System.IO.File]::OpenRead($filePath)
        $ras     = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($fs)
        $decoder = Await-WinRT ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($ras))    ([Windows.Graphics.Imaging.BitmapDecoder])
        $bmp     = Await-WinRT ($decoder.GetSoftwareBitmapAsync())                              ([Windows.Graphics.Imaging.SoftwareBitmap])

        $fs.Close(); $fs.Dispose(); $fs = $null

        # Windows OCR requires Bgra8 pixel format
        if ($bmp.BitmapPixelFormat -ne [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8) {
            $conv = [Windows.Graphics.Imaging.SoftwareBitmap]::Convert($bmp, [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8)
            $bmp.Dispose()
            $bmp = $conv
        }

        # Run OCR
        $result = Await-WinRT ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
        $bmp.Dispose(); $bmp = $null

        # Collect lines
        $lines = [System.Collections.Generic.List[string]]::new()
        foreach ($l in $result.Lines) {
            $t = $l.Text.Trim()
            if ($t -ne '') { $lines.Add($t) }
        }
        $text    = [string]::Join("`n", $lines)
        $encoded = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($text))
        [Console]::Out.WriteLine('OK:' + $encoded)

    } catch {
        $msg = ($_.Exception.Message -replace '[\r\n]+', ' ').Trim()
        [Console]::Out.WriteLine('ERR:' + $msg)
    } finally {
        if ($null -ne $fs)  { try { $fs.Close(); $fs.Dispose()  } catch {} }
        if ($null -ne $bmp) { try { $bmp.Dispose()               } catch {} }
        try { [System.IO.File]::Delete($filePath) } catch {}
    }

    [Console]::Out.Flush()
}
