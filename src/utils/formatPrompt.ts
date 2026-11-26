import type { Idea } from '../types/models';
import { KIND_META, PRIORITY_META, STATUS_META } from './constants';

export function formatIdeaAsPrompt(
  idea: Idea,
  folderName?: string | null
): string {
  const kindLabel = KIND_META[idea.kind].label;
  const statusLabel = STATUS_META[idea.status].label;
  const priorityLabel = PRIORITY_META[idea.priority].label;
  const projectLabel = folderName || 'Inbox (sin carpeta)';

  const lines: string[] = [
    `## ${kindLabel}: ${idea.title || 'Sin título'}`,
    `Proyecto: ${projectLabel} | Estado: ${statusLabel} | Prioridad: ${priorityLabel}`,
  ];

  if (idea.tags.length > 0) {
    lines.push(`Etiquetas: ${idea.tags.map((t) => `#${t}`).join(' ')}`);
  }

  if (idea.body.trim()) {
    lines.push('', 'Descripción:', idea.body.trim());
  }

  if (idea.checklist.length > 0) {
    lines.push('', 'Checklist:');
    for (const item of idea.checklist) {
      lines.push(`- [${item.done ? 'x' : ' '}] ${item.text}`);
    }
  }

  if (idea.notes.trim()) {
    lines.push('', 'Notas y contexto:', idea.notes.trim());
  }

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
