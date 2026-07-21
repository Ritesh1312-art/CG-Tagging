param (
    [string]$filePath,
    [string]$outPath
)

Add-Type -AssemblyName System.Drawing

$ext = [System.IO.Path]::GetExtension($filePath).ToLower()

if ($ext -eq ".pdf") {
    # Try Word COM if installed, safely destroying process
    $word = $null
    try {
        $word = New-Object -ComObject Word.Application -ErrorAction Stop
        $word.Visible = $false
        $word.DisplayAlerts = 0
        $doc = $word.Documents.Open($filePath, $false, $true)
        $text = $doc.Content.Text
        $text | Out-File -FilePath $outPath -Encoding utf8
        $doc.Close($false)
        Write-Output "SUCCESS"
    }
    catch {
        Write-Error $_.Exception.Message
    }
    finally {
        if ($word) {
            $word.Quit()
            [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
        }
        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
    }
}
elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg" -or $ext -eq ".png") {
    try {
        [void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
        $bitmap = [System.Drawing.Bitmap]::FromFile($filePath)
        $memoryStream = New-Object System.IO.MemoryStream
        $bitmap.Save($memoryStream, [System.Drawing.Imaging.ImageFormat]::Png)
        $memoryStream.Position = 0
        $randomAccessStream = [Windows.Storage.Streams.RandomAccessStream]::CreateFromStream($memoryStream)

        $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
        if ($ocrEngine -eq $null) {
            Write-Error "OCR engine could not be initialized."
            exit
        }

        $decoder = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($randomAccessStream).GetAwaiter().GetResult()
        $softwareBitmap = $decoder.GetSoftwareBitmapAsync().GetAwaiter().GetResult()
        $result = $ocrEngine.RecognizeAsync($softwareBitmap).GetAwaiter().GetResult()
        
        $result.Text | Out-File -FilePath $outPath -Encoding utf8
        Write-Output "SUCCESS"
    }
    catch {
        Write-Error $_.Exception.Message
    }
}
else {
    Write-Error "Unsupported file format: $ext"
}
