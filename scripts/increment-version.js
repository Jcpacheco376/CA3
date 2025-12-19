const fs = require('fs');
const path = require('path');

// Ruta al archivo AuthContext.tsx relativa a este script
const authContextPath = path.join(__dirname, '../CONTROL-DE-ASISTENCIA/src/features/auth/AuthContext.tsx');

try {
    // Leer el contenido del archivo
    let content = fs.readFileSync(authContextPath, 'utf8');

    // Expresión regular para encontrar la versión (ej. '0.9.5')
    // Captura grupos: 1=prefijo, 2=mayor, 3=menor, 4=parche, 5=sufijo
    const versionRegex = /(export\s+const\s+APP_DATA_VERSION\s*=\s*['"])(\d+)\.(\d+)\.(\d+)(['"];)/;
    
    const match = content.match(versionRegex);

    if (match) {
        const prefix = match[1];
        const major = match[2];
        const minor = match[3];
        let patch = parseInt(match[4], 10);
        const suffix = match[5];

        // Incrementar solo el último segmento (parche)
        patch++;

        // Construir la nueva línea
        const newVersion = `${major}.${minor}.${patch}`;
        const newContent = content.replace(versionRegex, `${prefix}${newVersion}${suffix}`);

        // Escribir el archivo actualizado
        fs.writeFileSync(authContextPath, newContent, 'utf8');
        
        console.log(`\n✅ [Versión] Actualizada automáticamente: ${major}.${minor}.${patch-1} -> ${newVersion}\n`);
    } else {
        console.warn('\n⚠️ [Versión] No se encontró la variable APP_DATA_VERSION en AuthContext.tsx. No se actualizó la versión.\n');
    }

} catch (error) {
    console.error('\n❌ [Versión] Error al intentar actualizar la versión:', error);
    process.exit(1);
}