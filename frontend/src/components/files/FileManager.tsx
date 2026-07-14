import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import axios from 'axios'

export default function FileManager() {
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] })
  })

  const remove = useMutation({
    mutationFn: (filename: string) => api.delete(`/files/${filename}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] })
  })

  const download = async (filename: string) => {
    const { data } = await api.get(`/download/${filename}`)
    window.open(data.url, '_blank')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    Array.from(e.dataTransfer.files).forEach(f => upload.mutate(f))
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">My Files</h2>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer mb-6
          ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <p className="text-gray-500 text-sm">Drag files here or click to select</p>
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
        <p className="text-blue-500 text-sm mb-4">Uploading...</p>
      )}

      {isLoading ? (
        <p className="text-gray-400">Loading files...</p>
      ) : (
        <ul className="space-y-2">
          {(filesData?.files || []).map((f: string) => (
            <li
              key={f}
              className="flex items-center justify-between bg-gray-50 p-3 rounded border"
            >
              <span className="font-mono text-sm">{f}</span>
              <div className="flex gap-3">
                <button
                  onClick={() => download(f)}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Download
                </button>
                <button
                  onClick={() => remove.mutate(f)}
                  className="text-red-500 hover:underline text-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {filesData?.files?.length === 0 && (
            <p className="text-gray-400 text-sm">No files uploaded yet</p>
          )}
        </ul>
      )}
    </div>
  )
}