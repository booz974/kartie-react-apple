/**
 * Carte de déplacement du verre liquide.
 *
 * `feDisplacementMap` ne floute pas : il déplace le point d'échantillonnage.
 * Pour chaque pixel de sortie il lit la couleur de la carte au même endroit et
 * en déduit un décalage :
 *
 *   sortie(x, y) = source(x + dx, y + dy)
 *   dx = (R / 255 − 0,5) × échelle
 *   dy = (G / 255 − 0,5) × échelle
 *
 * Un canal à 128 ne déplace donc rien. Toute la question est de savoir quoi
 * écrire dans R et G, et c'est là que se joue la différence entre le verre
 * dépoli et le verre d'Apple.
 *
 * Le principe optique : une lentille convexe est épaisse au centre et
 * s'amincit sur son pourtour. Un rayon qui traverse le biseau est dévié vers
 * l'intérieur, si bien que le bord du verre laisse voir ce qui se trouve un peu
 * plus au centre. On encode donc, dans la seule bande du biseau, un vecteur
 * unitaire **rentrant** dont l'amplitude est maximale au bord et s'annule à la
 * profondeur du biseau. Le centre reste neutre : du verre plat ne dévie rien.
 *
 * Conséquence sur le signe de l'échelle, qui est le piège de cette technique :
 * comme le vecteur encodé pointe déjà vers le centre, l'échelle doit être
 * **positive**. Les cartes construites à partir de simples dégradés linéaires
 * encodent au contraire un vecteur sortant et réclament une échelle négative.
 * Combiner une carte rentrante et une échelle négative retourne la lentille et
 * donne un effet d'oeil de poisson, où le bord repousse le décor au lieu de
 * l'attirer.
 */

/**
 * Distance signée d'un point au bord d'un rectangle arrondi.
 * Négative à l'intérieur, nulle sur le bord, positive à l'extérieur.
 */
function roundedRectSdf(
  px: number,
  py: number,
  width: number,
  height: number,
  radius: number,
): number {
  const cx = px - width / 2;
  const cy = py - height / 2;
  const hx = width / 2 - radius;
  const hy = height / 2 - radius;
  const qx = Math.abs(cx) - hx;
  const qy = Math.abs(cy) - hy;
  const inner = Math.min(Math.max(qx, qy), 0);
  const outer = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return inner + outer - radius;
}

/**
 * Interpolation d'Hermite. Une décroissance linéaire donnerait une arête
 * visible à l'aplomb du biseau ; le profil cubique épaissit le verre
 * progressivement, comme le ferait une vraie courbure.
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return 0;
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

export type DisplacementMapSpec = {
  width: number;
  height: number;
  radius: number;
  /** Épaisseur de la bande réfractante, en pixels. */
  bezel: number;
};

/**
 * Au delà de cette surface, la carte est calculée en résolution réduite puis
 * réétirée par `feImage`. Une barre de navigation large produirait sinon des
 * centaines de milliers de pixels à chaque redimensionnement, pour un gain
 * invisible : la carte ne contient que des dégradés très doux.
 */
const MAX_PIXELS = 240_000;

const cache = new Map<string, string>();

function cacheKey({ width, height, radius, bezel }: DisplacementMapSpec): string {
  return `${width}x${height}r${radius}b${bezel}`;
}

/**
 * Produit la carte sous forme de data URI PNG.
 *
 * Le résultat est mémoïsé : plusieurs surfaces de mêmes dimensions partagent la
 * même image, et un redimensionnement qui revient à une taille déjà vue ne
 * recalcule rien.
 */
export function buildDisplacementMap(spec: DisplacementMapSpec): string | null {
  const key = cacheKey(spec);
  const cached = cache.get(key);
  if (cached) return cached;

  const { radius, bezel } = spec;
  // Facteur commun aux deux axes : étirer la carte de façon anisotrope
  // déformerait le biseau, qui doit garder la même épaisseur sur tout le tour.
  const ratio = Math.min(1, Math.sqrt(MAX_PIXELS / (spec.width * spec.height)));
  const width = Math.max(8, Math.round(spec.width * ratio));
  const height = Math.max(8, Math.round(spec.height * ratio));
  const scaledRadius = radius * ratio;
  const scaledBezel = bezel * ratio;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const image = context.createImageData(width, height);
  const data = image.data;
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const distance = roundedRectSdf(px, py, width, height, scaledRadius);

      let r = 128;
      let g = 128;

      // Hors du verre, ou trop loin du bord pour être encore dans le biseau :
      // surface plane, aucune déviation.
      if (distance <= 0 && distance >= -scaledBezel) {
        const t = smoothstep(-scaledBezel, 0, distance);
        const dx = cx - px;
        const dy = cy - py;
        const length = Math.hypot(dx, dy);
        if (length > 1e-9) {
          r = Math.round(128 + (t * dx * 127) / length);
          g = Math.round(128 + (t * dy * 127) / length);
        }
      }

      const index = (y * width + x) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = 0;
      data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  const uri = canvas.toDataURL('image/png');
  cache.set(key, uri);
  return uri;
}

/**
 * `backdrop-filter: url(...)` n'est honoré que par Chromium. Ailleurs la
 * déclaration entière serait invalide, donc inutile de calculer quoi que ce
 * soit : la surface s'en tient au verre dépoli.
 */
export function supportsBackdropRefraction(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  return (
    CSS.supports('backdrop-filter', 'url(#k)') ||
    CSS.supports('-webkit-backdrop-filter', 'url(#k)')
  );
}
