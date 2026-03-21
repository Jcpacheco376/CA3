// shared/editions.ts
// Este archivo define las restricciones de permisos por edición de producto.

export interface EditionConfig {
    allowedPerms?: string[];       // Lista blanca de permisos exactos
    excludedPerms?: string[];      // Lista negra (soporta comodines como 'vacaciones.*')
    allowedClassifiers?: string[]; // Clasificadores permitidos
}

export const EDITIONS: { [key: string]: EditionConfig } = {
    BASIC: {
        allowedClassifiers: ['Core']
    },
    MERA: {
        excludedPerms: ['vacaciones.*', 'calendario.*'],
        allowedClassifiers: ['*']
    },
    FULL: {
        allowedClassifiers: ['*']
    }
};

/**
 * Verifica si un permiso específico está permitido en una edición.
 */
export const isPermissionAllowed = (permissionName: string, classifier: string | null, edition: string): boolean => {
    const config = EDITIONS[edition] || EDITIONS.FULL;

    // 1. Verificar Clasificador
    if (config.allowedClassifiers && !config.allowedClassifiers.includes('*')) {
        if (!classifier || !config.allowedClassifiers.includes(classifier)) {
            // Si no está en clasificadores permitidos, revisamos si está explícitamente en perms (lista blanca)
            if (!config.allowedPerms?.includes(permissionName)) {
                return false;
            }
        }
    }

    // 2. Verificar Lista Negra (Exclusiones)
    if (config.excludedPerms) {
        for (const pattern of config.excludedPerms) {
            const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            if (regex.test(permissionName)) {
                return false;
            }
        }
    }

    // 3. Verificar Lista Blanca (Si existe y no se ha denegado ya)
    if (config.allowedPerms && config.allowedPerms.length > 0) {
        if (!config.allowedPerms.includes(permissionName)) {
            // Si el clasificador es '*', permitimos todo lo que no esté en lista negra
            if (config.allowedClassifiers?.includes('*')) return true;
            return false;
        }
    }

    return true;
};
