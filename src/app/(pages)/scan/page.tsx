'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import NavbarComponent from '@/components/NavbarComponent'

interface UploadedFile {
  name: string
  size: number
  status: 'uploading' | 'analyzing' | 'completed' | 'failed'
  progress: number
  taskId?: string
  error?: string
}

export default function ScanFilesPage() {
  const [file, setFile] = useState<UploadedFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // =============================
  // GET ACCESS TOKEN
  // =============================
  async function getAccessToken(): Promise<{ token: string; uri: string }> {
    const res = await fetch('/api/auth/access', {
      method: 'GET',
      credentials: 'include'
    })

    if (!res.ok) throw new Error('Unauthorized')

    const data = await res.json()
    if (!data.success) {
      window.location.reload()
    }

    return {
      token: data.token,
      uri: data.uri
    }
  }

  // =============================
  // UPLOAD FILE
  // =============================
  async function uploadFile(selectedFile: File) {
    try {
      const { token, uri } = await getAccessToken()
      console.log(token, uri)

      const formData = new FormData()
      formData.append('file', selectedFile)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${uri}/api/analy/upload`)
      xhr.setRequestHeader('X-Access-Token', token)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          setFile(prev =>
            prev ? { ...prev, progress: percent } : null
          )
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)

          setFile(prev =>
            prev
              ? {
                ...prev,
                status: 'analyzing',
                progress: 100,
                taskId: response.task_id
              }
              : null
          )

          pollAnalysisStatus(response.task_id, uri, token)
        } else {
          throw new Error('Upload failed')
        }
      }

      xhr.onerror = () => {
        throw new Error('Network error')
      }

      xhr.send(formData)

    } catch (error) {
      setFile(prev =>
        prev
          ? {
            ...prev,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Upload failed'
          }
          : null
      )
    }
  }

  // =============================
  // POLL REPORT STATUS
  // =============================
  function pollAnalysisStatus(taskId: string, uri: string, token: string) {
    const interval = setInterval(async () => {
      try {
        const response = await axios.post(
          `${uri}/api/analy/report`,
          { task_id: taskId },
          { headers: { 'X-Access-Token': token } }
        )

        const res = response.data
        console.log(res)

        if (res.success) {
          if (res.status === 'success') {
            clearInterval(interval)

            setFile(prev =>
              prev ? { ...prev, status: 'completed' } : null
            )
          }

          if (res.status === 'failed') {
            clearInterval(interval)

            setFile(prev =>
              prev
                ? {
                  ...prev,
                  status: 'failed',
                  error: 'การวิเคราะห์ล้มเหลว'
                }
                : null
            )
          }
        }

      } catch {
        clearInterval(interval)
      }
    }, 5000)
  }

  // =============================
  // HANDLE FILE INPUT
  // =============================
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const maxSize = 1024 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      alert('ไฟล์ใหญ่เกิน 1GB')
      return
    }

    setFile({
      name: selectedFile.name,
      size: selectedFile.size,
      status: 'uploading',
      progress: 0
    })

    uploadFile(selectedFile)
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <NavbarComponent />

      <div className="max-w-2xl mx-auto space-y-6">

        {/* Upload Card */}
        <div className="bg-white/5 p-6 rounded-xl text-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-cyan-500 hover:bg-cyan-600 px-6 py-3 rounded text-white font-medium transition"
          >
            เลือกไฟล์เพื่อสแกน
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* File Status */}
        {file && (
          <div className="bg-white/5 p-6 rounded-xl space-y-4 border border-white/10">

            {/* File Name */}
            <div>
              <div className="text-white font-medium">{file.name}</div>
              <div className="text-xs text-blue-200/50">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>

            {/* Upload Progress */}
            {file.status === 'uploading' && (
              <>
                <div className="text-sm text-cyan-400">กำลังอัปโหลด...</div>
                <div className="w-full bg-gray-700 h-2 rounded">
                  <div
                    className="bg-cyan-500 h-2 rounded transition-all"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              </>
            )}

            {/* Processing Spinner */}
            {file.status === 'analyzing' && (
              <div className="flex items-center space-x-3 text-yellow-400">
                <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">
                  กำลังวิเคราะห์ไฟล์ กรุณารอสักครู่...
                </span>
              </div>
            )}

            {/* Completed */}
            {file.status === 'completed' && file.taskId && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-green-400">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <span>วิเคราะห์เสร็จสิ้น</span>
                </div>

                <button
                  onClick={() => router.push(`/reports/${file.taskId}`)}
                  className="w-full bg-green-500 hover:bg-green-600 px-4 py-2 rounded text-white transition"
                >
                  ดูผลการวิเคราะห์
                </button>
              </div>
            )}

            {/* Failed Alert */}
            {file.status === 'failed' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-400 mb-1">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs">
                    !
                  </div>
                  <span className="font-medium">การวิเคราะห์ล้มเหลว</span>
                </div>
                <div className="text-sm text-red-300">
                  {file.error || 'กรุณาลองใหม่อีกครั้ง'}
                </div>
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  )
}
