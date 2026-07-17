import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import axios from 'axios'
import { useToast } from '../../lib/toast'
import {
  FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon,
  Trash2, Download, Search, FolderOpen
} from 'lucide-react'

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return FileText
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return ImageIcon
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet
  return FileIcon
}

export default function FileManager() {
  const [dragging, setDragging] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const { data: filesData, isLoading } = useQuery({
    queryKey: ['files'],
    queryFn: () => api.get('/files').then(r => r.data)
  })

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { data } = await api.post(`/upload-url?filename=${file.name}`)
      await axios.put(data.url, file, {
        headers: { 'Content-Type': file.type }
      })
    },
    onSuccess: (_data, file) => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['usage'] })
      queryClient.invalidateQueries({ queryKey: ['usage-weekly'] })
      showToast(`${file.name} uploaded successfully`, 'success')
    },
    onError: (_err, file) => {
      showToast(`Failed to upload ${file.name}`, 'error')
    }
  })

  const remove = useMutation({
    mutationFn: (filename: string) => api.delete(`/files/${filename}`),
    onSuccess: (_data, filename) => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['usage'] })
      queryClient.invalidateQueries({ queryKey: ['usage-weekly'] })
      showToast(`${filename} deleted`, 'success')
      setConfirmDelete(null)
    },
    onError: (_err, filename) => {
      showToast(`Failed to delete ${filename}`, 'error')
      setConfirmDelete(null)
    }
  })

  const download = async (filename: string) => {
    try {
      const { data } = await api.get(`/download/${filename}`)
      window.open(data.url, '_blank')
    } catch {
      showToast(`Failed to get download link for ${filename}`, 'error')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    Array.from(e.dataTransfer.files).forEach(f => upload.mutate(f))
  }

  const allFiles: string[] = filesData?.files || []
  const visibleFiles = useMemo(
    () => allFiles.filter(f => f.toLowerCase().includes(search.toLowerCase())),
    [allFiles, search]
  )

  return (
    <div className="p-6 text-slate-50">
      <h2 className="text-xl font-bold mb-4">My Files</h2>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer mb-6 transition
          ${dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'}`}
      >
        <p className="text-slate-400 text-sm">Drag files here or click to select</p>
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          onChange={e =>
            Array.from(e.target.files || []).forEach(f => upload.mutate(f))
          }
        />
      </div>

      {upload.isPending && (
        <div className="mb-4 flex items-center gap-2 text-indigo-400 text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
          Uploading...
        </div>
      )}

      {allFiles.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
          />
        </div>
      )}

      {isLoading ? (
        <ul className="space-y-2">
          {[1, 2, 3].map(i => (
            <li key={i} className="h-14 animate-pulse rounded border border-slate-800 bg-slate-900/60" />
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {visibleFiles.map((f) => {
            const Icon = getFileIcon(f)
            const isConfirming = confirmDelete === f
            return (
              <li
                key={f}
                className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-3 rounded"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon size={18} className="shrink-0 text-slate-400" />
                  <span className="font-mono text-sm text-slate-200 truncate">{f}</span>
                </div>

                {isConfirming ? (
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400">Delete this file?</span>
                    <button
                      onClick={() => remove.mutate(f)}
                      disabled={remove.isPending}
                      className="text-red-400 hover:underline text-sm disabled:opacity-50"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-slate-400 hover:underline text-sm"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => download(f)}
                      className="flex items-center gap-1 text-indigo-400 hover:underline text-sm"
                    >
                      <Download size={14} /> Download
                    </button>
                    <button
                      onClick={() => setConfirmDelete(f)}
                      className="flex items-center gap-1 text-red-400 hover:underline text-sm"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </li>
            )
          })}

          {allFiles.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
              <FolderOpen size={28} />
              <p className="text-sm">No files uploaded yet</p>
            </div>
          )}

          {allFiles.length > 0 && visibleFiles.length === 0 && (
            <p className="text-slate-500 text-sm py-6 text-center">No files match "{search}"</p>
          )}
        </ul>
      )}
    </div>
  )
}