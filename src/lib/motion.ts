/** Ortak hareket ayarları (motion kütüphanesi). Yaylı geçişler: hızlı, az sekmeli. */
export const SPRING = { type: "spring", stiffness: 520, damping: 38, mass: 0.8 } as const;
export const SOFT = { type: "spring", stiffness: 300, damping: 30 } as const;
