// UI regression suites isolate the provider. test:agenda checks the real embed separately.
export const calendarEmbed = 'https://luma.com/embed/calendar/cal-fH2RJsxbE5e0vtS/events';
export async function stubCalendar(context) {
  await context.route(calendarEmbed, route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html lang="es"><head><title>Calendario de prueba</title></head><body><main><h1>Calendario de prueba</h1><a href="https://luma.com/thedatapub">Abrir Luma</a></main></body></html>',
  }));
}
