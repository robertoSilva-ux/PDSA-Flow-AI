import React, { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { FolderKanban, Loader2 } from 'lucide-react'

interface Project {
  id: number
  name: string
  description?: string
}

interface EditProjectDialogProps {
  project: Project | null
  onClose: () => void
  onConfirm: (id: number, name: string, description: string) => Promise<void>
}

export const EditProjectDialog: React.FC<EditProjectDialogProps> = ({ project, onClose, onConfirm }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
    }
  }, [project])

  const handleSubmit = async () => {
    if (!project || !name.trim()) return
    setSaving(true)
    await onConfirm(project.id, name.trim(), description.trim())
    setSaving(false)
  }

  return (
    <Dialog isOpen={!!project} onClose={onClose} title="Renomear Projeto">
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FolderKanban className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Altere o nome ou a descrição do projeto.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Nome do Projeto</label>
          <Input
            placeholder="Nome do projeto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Descrição (opcional)</label>
          <Textarea
            placeholder="Descrição do projeto..."
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
            Salvar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
