'use client'

import { useEffect, useState, type FormEvent } from 'react'
import QRCode from 'qrcode'
import { Download, Printer, RefreshCw, Trash2 } from 'lucide-react'
import type { AdminTable } from '@/lib/data/admin-tables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function tableUrl(restaurantSlug: string, qrToken: string) {
  return `${window.location.origin}/r/${restaurantSlug}/mesa/${qrToken}`
}

function slugify(label: string) {
  return label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
}

export function TableQrDialog({
  table, restaurantSlug, restaurantName, onClose,
}: { table: AdminTable | null; restaurantSlug: string; restaurantName: string; onClose: () => void }) {
  const [qr, setQr] = useState<{ token: string; dataUrl: string } | null>(null)
  const url = table ? tableUrl(restaurantSlug, table.qrToken) : ''

  useEffect(() => {
    if (!table) return
    let active = true
    // ponytail: colores del QR fijos en negro/blanco a propósito — el QR impreso necesita máximo contraste, no el tema.
    QRCode.toDataURL(url, { width: 320, margin: 2 })
      .then((dataUrl) => { if (active) setQr({ token: table.qrToken, dataUrl }) })
      .catch(() => { if (active) setQr(null) })
    return () => { active = false }
  }, [table, url])

  const dataUrl = qr && table && qr.token === table.qrToken ? qr.dataUrl : null

  function download() {
    if (!table || !dataUrl) return
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `qr-${slugify(table.label) || 'mesa'}.png`
    link.click()
  }

  function print() {
    if (!table || !dataUrl) return
    const win = window.open('', '_blank', 'width=480,height=640')
    if (!win) return
    const doc = win.document
    doc.title = `QR ${table.label}`
    doc.body.style.cssText = 'font-family:system-ui,sans-serif;text-align:center;padding:32px'
    const img = doc.createElement('img')
    img.src = dataUrl
    img.width = 320
    img.height = 320
    img.alt = `QR ${table.label}`
    const title = doc.createElement('h1')
    title.textContent = table.label
    const hint = doc.createElement('p')
    hint.textContent = `${restaurantName} · Escanea para ver el menú y pedir`
    doc.body.append(img, title, hint)
    img.onload = () => { win.focus(); win.print() }
  }

  return (
    <Dialog open={!!table} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR de {table?.label}</DialogTitle>
          <DialogDescription>Escanear abre el menú de esta mesa.</DialogDescription>
        </DialogHeader>
        {table && (
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="flex size-72 items-center justify-center rounded-2xl border border-border bg-card p-2">
              {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL generada en el navegador
                <img src={dataUrl} alt={`Código QR de ${table.label}`} width={272} height={272} />
              ) : (
                <p className="text-body-md text-muted-foreground">Generando…</p>
              )}
            </div>
            <p className="w-full break-all text-center text-label-md text-muted-foreground">{url}</p>
            <div className="flex w-full gap-2">
              <Button variant="ghost" className="flex-1" onClick={download} disabled={!dataUrl}>
                <Download /> Descargar PNG
              </Button>
              <Button className="flex-1" onClick={print} disabled={!dataUrl}>
                <Printer /> Imprimir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function LabelForm({
  initial, submitLabel, onSubmit,
}: { initial: string; submitLabel: string; onSubmit: (label: string) => Promise<void> }) {
  const [label, setLabel] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(label)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="table-label" className="text-label-md text-foreground">Nombre</label>
      <div className="flex gap-2">
        <Input
          id="table-label" value={label} maxLength={40} autoFocus placeholder="Ej. Mesa 05 o Terraza 2"
          aria-invalid={!!error} aria-describedby={error ? 'table-label-error' : undefined}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Button type="submit" disabled={saving || !label.trim() || label.trim() === initial}>{submitLabel}</Button>
      </div>
      {error && <p id="table-label-error" className="text-label-md text-destructive">{error}</p>}
    </form>
  )
}

export function CreateTableDialog({
  open, onClose, onCreate,
}: { open: boolean; onClose: () => void; onCreate: (label: string) => Promise<void> }) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva mesa</DialogTitle>
          <DialogDescription>El código QR se genera automáticamente.</DialogDescription>
        </DialogHeader>
        <div className="mt-4">{open && <LabelForm initial="" submitLabel="Crear" onSubmit={onCreate} />}</div>
      </DialogContent>
    </Dialog>
  )
}

type Confirming = 'regenerate' | 'delete' | null

export function EditTableDialog({
  table, onClose, onRename, onRegenerate, onDelete,
}: {
  table: AdminTable | null
  onClose: () => void
  onRename: (label: string) => Promise<void>
  onRegenerate: () => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState<Confirming>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const occupied = !!table?.session

  function close() {
    setConfirming(null)
    setError(null)
    onClose()
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setConfirming(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la acción.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!table} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {table?.label}</DialogTitle>
          <DialogDescription>Cambia el nombre, renueva el QR o elimina la mesa.</DialogDescription>
        </DialogHeader>
        {table && (
          <div className="mt-4 flex flex-col gap-5">
            <LabelForm key={table.id + table.label} initial={table.label} submitLabel="Guardar" onSubmit={onRename} />

            <section className="flex flex-col gap-2 border-t border-border pt-4">
              <h3 className="text-label-lg text-foreground">Código QR</h3>
              {confirming === 'regenerate' ? (
                <div className="flex flex-col gap-2 rounded-xl bg-warning-soft p-3 text-warning-soft-foreground">
                  <p className="text-body-md">El QR impreso actual dejará de funcionar. Tendrás que imprimir el nuevo.</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(null)} disabled={busy}>Cancelar</Button>
                    <Button size="sm" onClick={() => run(onRegenerate)} disabled={busy}>Regenerar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-body-md text-muted-foreground">
                    {occupied ? 'Cierra la mesa antes de regenerar su QR.' : 'Útil si el QR se filtró o se dañó.'}
                  </p>
                  <Button variant="ghost" className="self-start" onClick={() => setConfirming('regenerate')} disabled={occupied}>
                    <RefreshCw /> Regenerar QR
                  </Button>
                </>
              )}
            </section>

            <section className="flex flex-col gap-2 border-t border-border pt-4">
              <h3 className="text-label-lg text-foreground">Eliminar mesa</h3>
              {confirming === 'delete' ? (
                <div className="flex flex-col gap-2 rounded-xl bg-danger-soft p-3 text-danger-soft-foreground">
                  <p className="text-body-md">¿Eliminar {table.label}? Esta acción no se puede deshacer.</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(null)} disabled={busy}>Cancelar</Button>
                    <Button variant="destructive" size="sm" onClick={() => run(onDelete)} disabled={busy}>Eliminar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-body-md text-muted-foreground">Solo mesas sin pedidos registrados.</p>
                  <Button variant="ghost" className="self-start" onClick={() => setConfirming('delete')} disabled={occupied}>
                    <Trash2 /> Eliminar mesa
                  </Button>
                </>
              )}
            </section>

            {error && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-label-md text-danger-soft-foreground">{error}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
