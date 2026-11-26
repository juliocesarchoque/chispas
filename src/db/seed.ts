import { db, getMeta, newId, setMeta } from './dexie';
import type { Folder, Idea } from '../types/models';

export async function ensureSeedData(): Promise<void> {
  const hasSeeded = await getMeta('hasSeeded');
  if (hasSeeded === 'true') return;

  const [folderCount, ideaCount] = await Promise.all([
    db.folders.count(),
    db.ideas.count(),
  ]);

  if (folderCount > 0 || ideaCount > 0) {
    await setMeta('hasSeeded', 'true');
    return;
  }

  const now = Date.now();
  const iso = (minutesAgo: number) =>
    new Date(now - minutesAgo * 60_000).toISOString();

  const chispaId = newId();
  const productoId = newId();
  const uxId = newId();

  const folders: Folder[] = [
    {
      id: chispaId,
      name: 'Mi App Chispa',
      section: 'recent',
      color: 'terracotta',
      sortOrder: 0,
      createdAt: iso(240),
      updatedAt: iso(25),
      deletedAt: null,
      syncStatus: 'pending',
    },
    {
      id: productoId,
      name: 'Ideas de Producto',
      section: 'projects',
      color: 'sage',
      sortOrder: 1,
      createdAt: iso(1440),
      updatedAt: iso(120),
      deletedAt: null,
      syncStatus: 'pending',
    },
    {
      id: uxId,
      name: 'Mejoras UX',
      section: 'projects',
      color: 'lavender',
      sortOrder: 2,
      createdAt: iso(2880),
      updatedAt: iso(300),
      deletedAt: null,
      syncStatus: 'pending',
    },
  ];

  const ideas: Idea[] = [
    {
      id: newId(),
      folderId: null,
      title: 'Modo nocturno con un toque para no despertar la vista',
      body: 'Cuando abro la app a las 11 PM, quiero que el fondo cálido oscuro cargue sin flash blanco.',
      notes: 'Revisar que el meta theme-color también cambie en iOS y Android.',
      kind: 'ux',
      status: 'inbox',
      priority: 'high',
      tags: ['noche', 'tema'],
      checklist: [],
      coverImageUrl: null,
      createdAt: iso(18),
      updatedAt: iso(18),
      deletedAt: null,
      syncStatus: 'pending',
    },
    {
      id: newId(),
      folderId: null,
      title: 'Recordatorio semanal suave para limpiar el Inbox',
      body: 'Que los domingos muestre un resumen de cuántas chispas quedaron pendientes por mover a carpetas.',
      notes: '',
      kind: 'idea',
      status: 'inbox',
      priority: 'low',
      tags: ['hábito'],
      checklist: [],
      coverImageUrl: null,
      createdAt: iso(45),
      updatedAt: iso(45),
      deletedAt: null,
      syncStatus: 'pending',
    },
    {
      id: newId(),
      folderId: chispaId,
      title: 'Captura ultrarrápida estilo chat desde el botón +',
      body: 'Abrir teclado de inmediato, escribir sin pensar en carpetas ni estados y guardar directo en IndexedDB en 0 ms.',
      notes: 'Si ya estoy dentro de una carpeta, ofrecerla como destino predeterminado.',
      kind: 'feature',
      status: 'done',
      priority: 'high',
      tags: ['mvp', 'móvil'],
      checklist: [
        { id: newId(), text: 'Botón redondo + siempre accesible', done: true },
        { id: newId(), text: 'Guardar en local aunque esté en modo avión', done: true },
        { id: newId(), text: 'Confirmación rápida sin tapar la pantalla', done: true },
      ],
      coverImageUrl: null,
      createdAt: iso(190),
      updatedAt: iso(25),
      deletedAt: null,
      syncStatus: 'pending',
    },
    {
      id: newId(),
      folderId: chispaId,
      title: 'Botón Copiar como prompt para llevar features a código',
      body: 'Generar un bloque Markdown limpio con proyecto, prioridad, descripción, checklist y notas con un solo toque.',
      notes: 'Útil para pegar directo en ChatGPT, Claude o Antigravity sin reescribir nada.',
      kind: 'feature',
      status: 'ready',
      priority: 'high',
      tags: ['ia', 'productividad'],
      checklist: [
        { id: newId(), text: 'Incluir estado de cada tarea del checklist', done: true },
        { id: newId(), text: 'Feedback visual al copiar al portapapeles', done: true },
      ],
      coverImageUrl: null,
      createdAt: iso(210),
      updatedAt: iso(60),
      deletedAt: null,
      syncStatus: 'pending',
    },
    {
      id: newId(),
      folderId: productoId,
      title: 'Notas de voz rápidas con transcripción al volver el Wi-Fi',
      body: 'Para noches en las que da flojera escribir en el teclado del celular: grabar 15 segundos y guardarlo en local.',
      notes: 'Evaluar MediaRecorder API en Fase 4 + almacenamiento en Supabase Storage.',
      kind: 'idea',
      status: 'shaping',
      priority: 'medium',
      tags: ['voz', 'v2'],
      checklist: [
        { id: newId(), text: 'Probar permisos de micrófono en PWA', done: false },
        { id: newId(), text: 'Guardar blob de audio offline en Dexie', done: false },
      ],
      coverImageUrl: null,
      createdAt: iso(700),
      updatedAt: iso(120),
      deletedAt: null,
      syncStatus: 'pending',
    },
    {
      id: newId(),
      folderId: productoId,
      title: 'Vista tablero Kanban para priorizar en la computadora',
      body: 'En pantalla grande poder arrastrar features entre Inbox, Madurando, Lista y Hecha.',
      notes: 'Mantener la vista lista por defecto en teléfono para no complicar.',
      kind: 'feature',
      status: 'shaping',
      priority: 'medium',
      tags: ['desktop', 'v2'],
      checklist: [
        { id: newId(), text: 'Columnas por estado de idea', done: false },
      ],
      coverImageUrl: null,
      createdAt: iso(900),
      updatedAt: iso(400),
      deletedAt: null,
      syncStatus: 'pending',
    },
    {
      id: newId(),
      folderId: uxId,
      title: 'Carpetas creativas con tarjetas asomándose y botones redondos',
      body: 'Combinar tarjetas reales saliendo de cada carpeta con controles circulares cómodos para el pulgar.',
      notes: 'Paleta Papel Cálido & Salvia para que se sienta serena y personal.',
      kind: 'ux',
      status: 'ready',
      priority: 'high',
      tags: ['ui', 'diseño'],
      checklist: [
        { id: newId(), text: 'Mini-tarjetas inclinadas arriba de cada carpeta', done: true },
        { id: newId(), text: 'Filtros tipo píldora y botones circulares', done: true },
      ],
      coverImageUrl: null,
      createdAt: iso(1500),
      updatedAt: iso(300),
      deletedAt: null,
      syncStatus: 'pending',
    },
  ];

  await db.transaction('rw', db.folders, db.ideas, db.meta, async () => {
    await db.folders.bulkPut(folders);
    await db.ideas.bulkPut(ideas);
    await db.meta.put({ key: 'hasSeeded', value: 'true' });
  });
}
