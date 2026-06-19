import React, { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { FolderKanban, Loader2 } from 'lucide-react'

interface NewProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string, description: string) => Promise<void>
}

export const NewProjectDialog: React.FC<NewProjectDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onConfirm(name.trim(), description.trim())
    setSaving(false)
    setName('')
    setDescription('')
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Novo Projeto">
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FolderKanban className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Crie um projeto para agrupar seus ciclos PDSA relacionados.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Nome do Projeto</label>
          <Input
            placeholder="Ex: Clínica Odontológica, Projeto Robô..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Descrição (opcional)</label>
          <Textarea
            placeholder="Descreva o objetivo geral deste projeto..."
            className="min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderKanban className="w-4 h-4" />}
            Criar Projeto
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
