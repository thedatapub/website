// Public copy adapted from thedata.pub on 2026-11-14; provenance in docs/CONTENT-MIGRATION.md.
// Only add an upcoming event after verifying its date, timezone, venue and registration URL.
export const content = {
  checked: '2026-11-13',
  meetup: 'https://www.meetup.com/the-data-pub/',
  events: [],
  sections: [
    {
      id: 'events', route: 'events', label: 'Agenda',
      title: 'La siguiente ronda.', kicker: 'Encuentros · el tablón de la barra',
      description: 'Una buena pregunta merece una mesa. Encuentra la próxima charla, conoce a quien la está construyendo y trae tus dudas.',
      calendar: {
        url: 'https://luma.com/thedatapub',
        embedUrl: 'https://luma.com/embed/calendar/cal-fH2RJsxbE5e0vtS/events',
        title: 'Calendario de eventos de The Data Pub en Luma',
      },
      note: 'Consulta en Luma las próximas fechas, sedes y opciones de registro. Si el calendario aparece vacío o no carga, abre el calendario en Luma para comprobar las novedades.',
      blocks: [{ title: 'Cómo funcionan nuestros eventos', steps: [
        'Revisa el calendario: consulta los encuentros publicados en Luma y sus detalles.',
        'Confirma tu asistencia: cuando haya un encuentro disponible, regístrate desde su ficha en Luma y revisa las indicaciones de acceso.',
        'Ven y disfruta: llega a la sede anunciada, conoce a la comunidad y comparte tus preguntas.'
      ] }],
      links: [
        { label: 'Abrir el calendario en Luma', href: 'https://luma.com/thedatapub' },
        { label: 'Proponer una charla', href: 'contact/', internal: true },
      ],
    },
    {
      id: 'library', route: 'blog', label: 'Librero',
      title: 'Algo para llevarte.', kicker: 'Lecturas · el librero del pub',
      description: 'La conversación sigue después de la última ronda. Aquí puedes leer las publicaciones de The Data Pub y recorrer las charlas del archivo.',
      note: 'Cada publicación conserva su fecha original. Los anuncios históricos cuentan lo que se proponía entonces.',
      blocks: [],
      links: [{ label: 'Explorar las charlas', href: 'tv/', internal: true }],
    },
    {
      id: 'about', route: 'about', label: 'Nosotros',
      title: 'Pásale, hay lugar.', kicker: 'Sobre la barra · conversación sin pose',
      description: 'Nos juntan los datos y las ganas de entender. Somos una comunidad de Ciudad de México que se reúne cada mes para conversar sobre análisis de datos, desde problemas pequeños hasta sistemas a gran escala.',
      note: 'La sede publicada es la Escuela de Gobierno y Transformación Pública del Tecnológico de Monterrey, Av. Revolución 756, Ciudad de México. Consulta la ficha de cada evento para confirmar dónde nos reunimos.',
      blocks: [
        { title: 'Rigor sin barreras', paragraphs: ['Las etiquetas de moda no deberían dificultar la comprensión ni dejar a nadie fuera. Preferimos hablar con claridad sobre análisis de datos: qué resuelve, cómo funciona y qué límites tiene. La curiosidad y las preguntas tienen lugar en esta mesa.'] },
        { title: 'Lo que conversamos', paragraphs: ['Estadística aplicada, gestión y visualización de datos, modelos predictivos, minería de datos y aprendizaje automático. También hablamos de Apache Spark, cómputo en la nube y herramientas para trabajar a distintas escalas.'] },
        { title: 'Una comunidad desde 2015', paragraphs: ['Desde 2015 compartimos proyectos, charlas y conversaciones en Ciudad de México. La videoteca permite recorrer los encuentros y sus ponentes. La convivencia también importa: aprender y conocer gente van juntos.'] },
      ],
      links: [
        { label: 'Recorrer nuestra historia', href: 'tv/', internal: true },
        { label: 'Conocer al equipo', href: 'contact/', internal: true },
      ],
    },
    {
      id: 'contact', route: 'contact', label: 'Equipo',
      title: 'Pon algo sobre la mesa.', kicker: 'El equipo · ideas · charlas · colaboraciones',
      description: 'La comunidad se construye entre quienes organizan, comparten y participan. La página pública reconoce a Jesús Ramos como organizador junto con un equipo de coorganizadores.',
      note: 'Para conversar con el equipo, usa los canales oficiales de la comunidad.',
      blocks: [
        { title: 'Propón una charla', paragraphs: ['Si quieres compartir un tema de análisis de datos, escríbenos por nuestros canales. Cuéntanos tu idea y qué te gustaría conversar con la comunidad.'] },
        { title: 'Colabora o patrocina un encuentro', paragraphs: ['Para proponer una colaboración o el apoyo de tu empresa a un evento, contacta al equipo por LinkedIn o Meetup.'] },
      ],
      links: [
        { label: 'Meetup', href: 'https://www.meetup.com/the-data-pub/' },
        { label: 'LinkedIn', href: 'https://www.linkedin.com/company/thedatapub/' },
        { label: 'X · @thedatapub', href: 'https://x.com/thedatapub' },
        { label: 'Facebook', href: 'https://www.facebook.com/thedatapub/' },
      ],
    },
  ],
};
