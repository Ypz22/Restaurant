import { describe, it, expect } from 'vitest'
import { summarizePending, type KitchenTicket } from '@/lib/data/admin-kitchen'

function ticket(tableLabel: string, status: KitchenTicket['status'], items: [string, number, boolean?][]): KitchenTicket {
  return {
    roundId: tableLabel + status,
    tableLabel,
    submittedAt: '2026-09-16T12:00:00Z',
    status,
    kitchenNotes: '',
    items: items.map(([dishName, quantity, prepared], i) => ({
      id: `${tableLabel}-${i}`, dishName, quantity, notes: '', preparedAt: prepared ? '2026-09-16T12:05:00Z' : null,
    })),
  }
}

describe('summarizePending', () => {
  it('sums unprepared items across tables, sorted by quantity then name', () => {
    const result = summarizePending([
      ticket('M04', 'pending', [['Lomo', 2], ['Salmón', 1]]),
      ticket('M07', 'preparing', [['Lomo', 3], ['Papas', 1, true], ['Arroz', 1]]),
      ticket('M04', 'preparing', [['Lomo', 1]]),
    ])
    expect(result).toEqual([
      { dishName: 'Lomo', quantity: 6, tables: [{ label: 'M04', quantity: 3 }, { label: 'M07', quantity: 3 }] },
      { dishName: 'Arroz', quantity: 1, tables: [{ label: 'M07', quantity: 1 }] },
      { dishName: 'Salmón', quantity: 1, tables: [{ label: 'M04', quantity: 1 }] },
    ])
  })

  it('ignores ready tickets', () => {
    expect(summarizePending([ticket('M01', 'ready', [['Lomo', 2]])])).toEqual([])
  })
})
