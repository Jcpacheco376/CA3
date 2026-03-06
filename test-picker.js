const { execSync } = require('child_process');
const fs = require('fs');

try {
    const initialPath = "C:\\Windows\\System32";
    // Solo escapar comillas simples, NO dobles barras, porque powershell lo interpreta literal
    const safeInit = (initialPath && fs.existsSync(initialPath))
        ? initialPath.trim().replace(/'/g, "''") : '';

    console.log("SafeInit:", safeInit);

    const ps = [
        `Add-Type -AssemblyName System.Windows.Forms | Out-Null;`,
        `$f = New-Object System.Windows.Forms.OpenFileDialog;`,
        `$f.Title = 'Test';`,
        `$f.Filter = 'Carpetas|*.none';`,
        `$f.CheckFileExists = $false;`,
        `$f.CheckPathExists = $false;`,
        `$f.FileName = 'Seleccione_Carpeta';`,
        `$f.ValidateNames = $false;`,
        `[System.Environment]::CurrentDirectory = '${safeInit}';`,
        `$f.InitialDirectory = '${safeInit}';`,
        `if ($f.ShowDialog() -eq 'OK') { Write-Output ([System.IO.Path]::GetDirectoryName($f.FileName)) } else { Write-Output '' }`
    ].filter(Boolean).join(' ');

    console.log("Running...");
    const selected = execSync(`powershell -Sta -NoProfile -Command "${ps}"`, { timeout: 60000 }).toString().trim();
    console.log("Selected:", selected);
} catch (err) {
    console.error("Error:", err.message);
}
