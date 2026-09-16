export function EmptyCartState({ onBrowseMenu }: { onBrowseMenu: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-headline-md text-onSurface">Tu pedido está vacío</p>
      <p className="text-body-lg text-onSurface/70">Agrega platos del menú para empezar.</p>
      <button onClick={onBrowseMenu} className="rounded-md bg-brasa-primary px-6 py-3 font-semibold text-onPrimary">
        Ver menú
      </button>
    </div>
  )
}
