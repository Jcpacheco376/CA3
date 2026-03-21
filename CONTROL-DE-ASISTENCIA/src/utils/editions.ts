// Duplicate of editions logic for frontend (since they don't share a common package yet)
export interface EditionConfig {
    allowedPerms?: string[];
    excludedPerms?: string[];
    allowedClassifiers?: string[];
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

export const isPermissionAllowed = (permissionName: string, classifier: string | null, edition: string): boolean => {
    const config = EDITIONS[edition] || EDITIONS.FULL;
    if (config.allowedClassifiers && !config.allowedClassifiers.includes('*')) {
        if (!classifier || !config.allowedClassifiers.includes(classifier)) {
            if (!config.allowedPerms?.includes(permissionName)) return false;
        }
    }
    if (config.excludedPerms) {
        for (const pattern of config.excludedPerms) {
            const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            if (regex.test(permissionName)) return false;
        }
    }
    return true;
};
