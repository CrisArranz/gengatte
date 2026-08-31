import type { ReactNode } from 'react'
import { STAT_LABEL_ES } from '../data/schema'
import { useDataset } from '../data/pokedexContext'
import { DATA_MANIFEST } from '../data/manifest'
import { NATURE_DISCLAIMER } from '../domain/nature'

function Question({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg uppercase">{title}</h2>
      <div className="space-y-2 text-sm">{children}</div>
    </section>
  )
}

/** PLAN.md 6.4: como se calcula todo y de donde salen los datos. */
export function FaqPage() {
  const { reference } = useDataset()
  const neutral = reference.natures.filter((nature) => nature.up === null)
  const modifying = reference.natures.filter((nature) => nature.up !== null)

  const generated = new Date(DATA_MANIFEST.generatedAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl uppercase">Preguntas frecuentes</h1>

      <Question title="¿Qué son las naturalezas?">
        <p>
          Cada Pokémon tiene una de las 25 naturalezas. Una naturaleza sube un 10 % una estadística
          y baja un 10 % otra, entre las cinco que no son PS: ataque, defensa, ataque especial,
          defensa especial y velocidad. Los PS nunca se ven afectados, porque su fórmula no incluye
          el multiplicador de naturaleza.
        </p>
        <p>
          Cinco de las 25 suben y bajan la misma estadística, así que su efecto es nulo:{' '}
          {neutral.map((nature) => nature.nameEs).join(', ')}.
        </p>

        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-left">
                <th scope="col">Naturaleza</th>
                <th scope="col">Inglés</th>
                <th scope="col">+10 %</th>
                <th scope="col">−10 %</th>
              </tr>
            </thead>
            <tbody>
              {modifying.map((nature) => (
                <tr key={nature.id}>
                  <th scope="row" className="pr-4 text-left font-normal">
                    {nature.nameEs}
                  </th>
                  <td className="pr-4 opacity-70">{nature.name}</td>
                  <td className="pr-4">{nature.up && STAT_LABEL_ES[nature.up]}</td>
                  <td>{nature.down && STAT_LABEL_ES[nature.down]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Question>

      <Question title="¿Cómo se elige la naturaleza recomendada?">
        <p>
          A partir de las estadísticas base: se sube la velocidad si el Pokémon ya es rápido y
          ofensivo, porque adelantarse suele decidir el combate; si no, se sube su mejor vía de
          daño, o su mejor defensa cuando el perfil es defensivo. Se baja siempre la estadística que
          no usa, normalmente el ataque que no aprovecha.
        </p>
        <p>{NATURE_DISCLAIMER}</p>
      </Question>

      <Question title="¿Por qué el x4 solo aparece en Pokémon de doble tipo?">
        <p>
          Al defender, un mismo ataque atraviesa los dos tipos a la vez, así que los factores se
          multiplican: x2 por uno y x2 por el otro dan x4. Con un solo tipo el máximo posible es x2,
          y el mínimo distinto de cero, x0,5.
        </p>
        <p>
          Al atacar ocurre lo contrario: un movimiento tiene un único tipo, así que los tipos del
          Pokémon <strong>no</strong> se multiplican entre sí. Por eso la ficha muestra la
          efectividad de cada tipo por separado, y además la mejor cobertura combinada, que es el
          mayor multiplicador alcanzable con uno u otro.
        </p>
      </Question>

      <Question title="¿Cómo se calculan las estadísticas a nivel 100?">
        <p>Con las fórmulas vigentes desde la tercera generación:</p>
        <pre className="overflow-x-auto border border-current p-2 text-xs">
          {`PS    = floor((2*Base + IV + floor(EV/4)) * Nivel / 100) + Nivel + 10
Resto = floor((floor((2*Base + IV + floor(EV/4)) * Nivel / 100) + 5) * Naturaleza)`}
        </pre>
        <p>
          Los <strong>IV</strong> son valores individuales de 0 a 31 con los que nace cada Pokémon.
          Los <strong>EV</strong> son puntos de esfuerzo que se ganan combatiendo, hasta 252 por
          estadística. El mínimo que muestra la ficha usa IV 0, EV 0 y naturaleza perjudicial; el
          máximo, IV 31, EV 252 y naturaleza beneficiosa; y el valor neutro, IV 31 con EV 0 y
          naturaleza neutra, como referencia realista.
        </p>
      </Question>

      <Question title="¿De dónde salen los datos?">
        <p>
          De{' '}
          <a href="https://pokeapi.co" className="underline underline-offset-4">
            PokeAPI
          </a>
          , descargados una sola vez con un script que genera los ficheros JSON que acompañan a la
          aplicación. Esta copia contiene {DATA_MANIFEST.count} Pokémon y se generó el {generated}.
        </p>
        <p>
          Por eso la aplicación no hace ninguna petición a PokeAPI mientras la usas: todo el cálculo
          ocurre en tu navegador sobre datos ya descargados. Las imágenes sí son remotas, servidas
          desde el repositorio de sprites de PokeAPI.
        </p>
      </Question>
    </div>
  )
}
