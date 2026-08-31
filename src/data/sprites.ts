/**
 * Las imagenes se sirven desde el repositorio de sprites de PokeAPI.
 * No se guardan en local y la URL se deduce del id, sin peticion previa
 * para descubrirla.
 */

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'

/** Ilustracion grande para la ficha. */
export const artworkUrl = (id: number): string =>
  `${SPRITES}/pokemon/other/official-artwork/${id}.png`

/** Sprite pequeno para las tarjetas del buscador. */
export const spriteUrl = (id: number): string => `${SPRITES}/pokemon/${id}.png`

/** Icono de tipo para las cabeceras de la tabla de efectividades. */
export const typeIconUrl = (typeId: number, small?: boolean): string =>
  `${SPRITES}/types/generation-ix/scarlet-violet${small ? '/small' : ''}/${typeId}.png`
