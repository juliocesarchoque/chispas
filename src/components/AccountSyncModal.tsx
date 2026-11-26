import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Cloud,
  CloudOff,
  Download,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { db } from '../db/dexie';
import { supabase } from '../lib/supabase';
import type { SyncEngineState } from '../lib/sync';
import { formatRelativeDate } from '../utils/constants';

interface AccountSyncModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  isOnline: boolean;
  isSupabaseConfigured: boolean;
  syncState: SyncEngineState;
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  onSyncNow: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function AccountSyncModal({
  open,
  onClose,
  user,
  isOnline,
  isSupabaseConfigured,
  syncState,
  pendingCount,
  lastSyncAt,
  lastError,
  onSyncNow,
  onToast,
}: AccountSyncModalProps) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!open) return null;

  const handleExportBackup = async () => {
    const [folders, ideas] = await Promise.all([
      db.folders.toArray(),
      db.ideas.toArray(),
    ]);
    const payload = {
      app: 'Chispa',
      exportedAt: new Date().toISOString(),
      folders: folders.filter((f) => f.deletedAt === null),
      ideas: ideas.filter((i) => i.deletedAt === null),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chispa-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Respaldo JSON descargado');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      if (authMode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setAuthMessage('Te enviamos un enlace mágico a tu correo.');
      } else if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setAuthMessage('Cuenta creada. Si tu proyecto pide confirmación, revisa tu correo.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onToast('Sesión iniciada. Sincronizando...');
      }
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'No se pudo autenticar'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    onToast('Sesión cerrada. Tus ideas siguen guardadas localmente.');
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 pb-safe shadow-[var(--shadow-float)] sm:rounded-[28px]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Sincronización y respaldo
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status card */}
        <div className="rounded-2xl bg-[var(--bg-canvas)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                  isOnline
                    ? 'bg-[#7A9184]/20 text-[#4E695A] dark:text-[#A9C2B3]'
                    : 'bg-[#C96F53]/18 text-[#B15337] dark:text-[#EE9F86]'
                }`}
              >
                {isOnline ? <Cloud size={18} /> : <CloudOff size={18} />}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {!isSupabaseConfigured
                    ? 'Modo local sin nube'
                    : !isOnline
                      ? 'Sin conexión (Modo offline activo)'
                      : syncState === 'syncing'
                        ? 'Sincronizando...'
                        : user
                          ? 'Conectado con Supabase'
                          : 'Listo para iniciar sesión'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {pendingCount > 0
                    ? `${pendingCount} cambio(s) pendiente(s) por subir`
                    : lastSyncAt
                      ? `Última sync: ${formatRelativeDate(lastSyncAt)}`
                      : 'Todo guardado en este dispositivo'}
                </p>
              </div>
            </div>

            {isSupabaseConfigured && user && (
              <button
                type="button"
                disabled={!isOnline || syncState === 'syncing'}
                onClick={() => void onSyncNow()}
                aria-label="Sincronizar ahora"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-ink)] text-[var(--accent-ink-fg)] transition hover:scale-105 disabled:opacity-40"
              >
                <RefreshCw
                  size={16}
                  className={syncState === 'syncing' ? 'animate-spin' : ''}
                />
              </button>
            )}
          </div>

          {lastError && (
            <p className="mt-2.5 rounded-xl bg-[#C96F53]/12 px-3 py-2 text-xs text-[#B15337] dark:text-[#EE9F86]">
              {lastError}
            </p>
          )}
        </div>

        {/* Auth or setup guide */}
        <div className="mt-4">
          {!isSupabaseConfigured ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-primary)]">
                Cómo activar la sincronización entre teléfono y PC:
              </p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                <li>
                  Ejecuta <code className="rounded bg-[var(--bg-canvas)] px-1.5 py-0.5">supabase/schema.sql</code> en el SQL Editor de tu proyecto Supabase.
                </li>
                <li>
                  Copia <code className="rounded bg-[var(--bg-canvas)] px-1.5 py-0.5">.env.example</code> a{' '}
                  <code className="rounded bg-[var(--bg-canvas)] px-1.5 py-0.5">.env</code> con tu{' '}
                  <code className="rounded bg-[var(--bg-canvas)] px-1.5 py-0.5">VITE_SUPABASE_URL</code> y{' '}
                  <code className="rounded bg-[var(--bg-canvas)] px-1.5 py-0.5">VITE_SUPABASE_PUBLISHABLE_KEY</code>.
                </li>
                <li>Reinicia o despliega la app e inicia sesión aquí.</li>
              </ol>
            </div>
          ) : user ? (
            <div className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#557061] dark:text-[#A9C2B3]">
                  <ShieldCheck size={14} />
                  <span>Cuenta vinculada</span>
                </div>
                <p className="mt-0.5 truncate text-sm font-medium text-[var(--text-primary)]">
                  {user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-subtle)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                <LogOut size={13} />
                Salir
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleAuthSubmit(e)} className="space-y-3">
              <div className="flex gap-1.5">
                {[
                  { id: 'signin' as const, label: 'Entrar' },
                  { id: 'signup' as const, label: 'Crear cuenta' },
                  { id: 'magic' as const, label: 'Enlace mágico' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setAuthMode(tab.id);
                      setAuthError(null);
                      setAuthMessage(null);
                    }}
                    className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition ${
                      authMode === tab.id
                        ? 'bg-[var(--accent-ink)] text-[var(--accent-ink-fg)]'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-2xl bg-[var(--bg-canvas)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-sage)]/50"
              />

              {authMode !== 'magic' && (
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña (mínimo 6 caracteres)"
                  className="w-full rounded-2xl bg-[var(--bg-canvas)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-sage)]/50"
                />
              )}

              {authError && (
                <p className="text-xs text-[#C96F53]">{authError}</p>
              )}
              {authMessage && (
                <p className="text-xs text-[#557061] dark:text-[#A9C2B3]">
                  {authMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={authLoading || !isOnline}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-ink)] py-2.5 text-sm font-semibold text-[var(--accent-ink-fg)] transition hover:opacity-90 disabled:opacity-40"
              >
                <Mail size={15} />
                <span>
                  {authLoading
                    ? 'Procesando...'
                    : authMode === 'magic'
                      ? 'Enviar enlace al correo'
                      : authMode === 'signup'
                        ? 'Crear cuenta y sincronizar'
                        : 'Iniciar sesión y sincronizar'}
                </span>
              </button>
            </form>
          )}
        </div>

        {/* Always-available local backup export */}
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          <button
            type="button"
            onClick={() => void handleExportBackup()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--bg-subtle)] py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
          >
            <Download size={14} />
            Exportar respaldo local (.json)
          </button>
        </div>
      </div>
    </div>
  );
}
