export interface IconCatalogItem {
    name: string;
    tags: string[];
}

export const ICON_CATALOG: IconCatalogItem[] = [
    // --- HOLIDAYS & SEASONS ---
    { name: 'TreePine', tags: ['navidad', 'arbol', 'pino', 'nochebuena', 'christmas', 'tree'] },
    { name: 'PartyPopper', tags: ['fiesta', 'celebracion', 'año nuevo', 'ano nuevo', 'party', 'popper', 'evento', 'confeti'] },
    { name: 'Swords', tags: ['revolucion', 'revolucion mexicana', 'batalla', 'independencia', 'espadas', 'swords', 'battle'] },
    { name: 'Ghost', tags: ['halloween', 'fantasma', 'miedo', 'susto', 'terror', 'ghost', 'spooky'] },
    { name: 'Skull', tags: ['muertos', 'difuntos', 'halloween', 'calavera', 'skull', 'death'] },
    { name: 'Candy', tags: ['dulce', 'caramelo', 'niño', 'halloween', 'candy', 'sweet'] },
    { name: 'Bird', tags: ['paloma', 'paz', 'pajaro', 'religioso', 'espiritu', 'dove', 'bird', 'peace'] },
    { name: 'Church', tags: ['iglesia', 'santo', 'semana santa', 'religioso', 'jueves santo', 'viernes santo', 'church', 'holy'] },
    { name: 'Heart', tags: ['amor', 'amistad', 'madre', 'padre', 'corazon', 'love', 'heart', 'san valentin'] },
    { name: 'Flag', tags: ['bandera', 'patria', 'independencia', 'mexico', 'flag', 'nacional'] },
    { name: 'Cake', tags: ['cumpleaños', 'pastel', 'cumple', 'cake', 'birthday', 'celebracion', 'natalicio'] },
    { name: 'Flower2', tags: ['primavera', 'flor', 'flower', 'spring', 'naturaleza'] },
    { name: 'Sun', tags: ['verano', 'sol', 'calor', 'clima', 'sun', 'summer', 'vacaciones'] },
    { name: 'CloudSnow', tags: ['invierno', 'nieve', 'frio', 'clima', 'snow', 'winter'] },
    { name: 'Moon', tags: ['noche', 'descanso', 'moon', 'night'] },
    { name: 'Stars', tags: ['magia', 'estrellas', 'noche', 'stars', 'magic'] },

    // --- WORK & BUSINESS ---
    { name: 'HardHat', tags: ['trabajo', 'trabajador', 'laboral', 'casco', 'hardhat', 'work', 'obrero'] },
    { name: 'Briefcase', tags: ['negocios', 'oficina', 'maletin', 'briefcase', 'business', 'corporativo'] },
    { name: 'Building', tags: ['edificio', 'empresa', 'corporativo', 'building', 'office'] },
    { name: 'Scale', tags: ['constitucion', 'ley', 'justicia', 'balanza', 'scale', 'law', 'legal'] },
    { name: 'GraduationCap', tags: ['maestro', 'profesor', 'graduacion', 'escuela', 'clase', 'education', 'cap', 'estudio'] },
    { name: 'Book', tags: ['lectura', 'estudio', 'libro', 'book', 'read', 'biblioteca'] },
    { name: 'Handshake', tags: ['acuerdo', 'trato', 'socio', 'union', 'handshake', 'deal'] },
    { name: 'Users', tags: ['equipo', 'reunion', 'junta', 'people', 'users', 'team', 'colaboracion'] },

    // --- TRANSPORT & TRAVEL ---
    { name: 'Plane', tags: ['viaje', 'avion', 'vuelo', 'travel', 'flight', 'turismo'] },
    { name: 'Palmtree', tags: ['vacaciones', 'playa', 'descanso', 'palmera', 'vaca', 'holiday', 'beach', 'relax'] },
    { name: 'Ship', tags: ['crucero', 'barco', 'mar', 'ship', 'cruise', 'puerto'] },
    { name: 'Bus', tags: ['transporte', 'autobus', 'camion', 'bus', 'travel'] },
    { name: 'Car', tags: ['carro', 'auto', 'vehiculo', 'car', 'transport'] },
    { name: 'MapPin', tags: ['ubicacion', 'lugar', 'mapa', 'location', 'place', 'destino'] },
    { name: 'Trees', tags: ['campo', 'bosque', 'naturaleza', 'trees', 'forest', 'ecologia'] },
    { name: 'Mountain', tags: ['montaña', 'aventura', 'escalar', 'mountain', 'adventure'] },
    { name: 'Tent', tags: ['camping', 'campamento', 'aventura', 'tent', 'outdoor'] },

    // --- CELEBRATION & GIFTS ---
    { name: 'Gift', tags: ['regalo', 'presente', 'obsequio', 'gift', 'present', 'sorpresa'] },
    { name: 'Bell', tags: ['alerta', 'recordatorio', 'campana', 'bell', 'alert', 'aviso'] },
    { name: 'Trophy', tags: ['premio', 'ganador', 'trofeo', 'trophy', 'award', 'victoria'] },
    { name: 'Medal', tags: ['medalla', 'reconocimiento', 'merito', 'medal', 'merit', 'honor'] },
    { name: 'Ticket', tags: ['boleto', 'entrada', 'ticket', 'evento', 'cine', 'concierto'] },
    { name: 'Music', tags: ['musica', 'concierto', 'festival', 'music', 'sound', 'baile'] },
    { name: 'Gamepad2', tags: ['juego', 'diversion', 'gamer', 'game', 'fun', 'entretenimiento'] },

    // --- FOOD & DRINK ---
    { name: 'Coffee', tags: ['cafe', 'break', 'descanso', 'reunion', 'coffee', 'desayuno'] },
    { name: 'Utensils', tags: ['comida', 'almuerzo', 'restaurante', 'food', 'utensils', 'cena'] },
    { name: 'Beer', tags: ['bebida', 'cerveza', 'reunion', 'beer', 'drink', 'brindis'] },
    { name: 'Wine', tags: ['brindis', 'vino', 'celebracion', 'wine', 'drink', 'cena'] },
    { name: 'Pizza', tags: ['comida', 'compartir', 'pizza', 'food', 'fastfood'] },

    // --- HEALTH & SPORTS ---
    { name: 'Stethoscope', tags: ['salud', 'medico', 'enfermo', 'doctor', 'health', 'hospital'] },
    { name: 'HeartPulse', tags: ['emergencia', 'vida', 'pulso', 'heartbeat', 'medical', 'clinica'] },
    { name: 'Dumbbell', tags: ['deporte', 'ejercicio', 'gym', 'fitness', 'dumbbell', 'sport'] },

    // --- OTHER & SYSTEM ---
    { name: 'CalendarOff', tags: ['feriado', 'asueto', 'descanso', 'no laborable', 'off', 'closed'] },
    { name: 'Info', tags: ['informacion', 'aviso', 'nota', 'info'] },
    { name: 'AlertTriangle', tags: ['advertencia', 'peligro', 'alerta', 'warning', 'hazard', 'cuidado'] },
    { name: 'Lightbulb', tags: ['idea', 'innovacion', 'foco', 'idea', 'innovation', 'creatividad'] },
    { name: 'Zap', tags: ['urgente', 'rapido', 'rayo', 'quick', 'fast', 'lightning'] },
    { name: 'Smile', tags: ['felicidad', 'alegria', 'emoji', 'smile', 'happy'] },
    { name: 'Camera', tags: ['foto', 'recuerdo', 'camara', 'photo', 'memory'] },
    { name: 'Mail', tags: ['email', 'carta', 'correo', 'mail', 'send', 'notificacion'] },
];
