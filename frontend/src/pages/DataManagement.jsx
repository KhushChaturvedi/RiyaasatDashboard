import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  Upload, Trash2, Database, AlertTriangle, CheckCircle2,
  Info, ChevronDown, ChevronUp, Target, UserCheck, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from '../components/ui/ConfirmModal'
import { uploadAPI, columnMappingAPI } from '../services/api'
import { formatDateTimeDisplay } from '../utils/dateUtils'

// ─── Upload Card ────────────────────────────────────────────────────────────

function UploadCard({
  number, title, subtitle, accent,
  status, statusContent,
  onUpload, needsConfirm = false, confirmMsg,
  accepts = { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)

  const doUpload = useCallback(async (file) => {
    setUploading(true)
    setProgress(0)
    setResult(null)
    try {
      const res = await onUpload(file, (e) => setProgress(Math.round((e.loaded / e.total) * 100)))
      setResult({ ok: true, data: res.data })
      toast.success(`${title} uploaded successfully`)
    } catch (err) {
      setResult({ ok: false, msg: err.message || 'Upload failed' })
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [onUpload, title])

  const onDrop = useCallback((accepted) => {
    if (!accepted.length) return
    if (needsConfirm) {
      setPendingFile(accepted[0])
      setConfirmOpen(true)
    } else {
      doUpload(accepted[0])
    }
  }, [needsConfirm, doUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accepts,
    maxFiles: 1,
    disabled: uploading,
  })

  const borderColor = isDragActive ? accent : `${accent}55`
  const bgColor = isDragActive ? `${accent}0c` : 'transparent'

  return (
    <>
      <div className="card" style={{ padding: 24, borderTop: `3px solid ${accent}` }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          <span style={{
            fontSize: 36, fontWeight: 900, lineHeight: 1,
            color: `${accent}30`, letterSpacing: '-0.03em', flexShrink: 0,
          }}>
            {number}
          </span>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
              {title}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{subtitle}</p>
          </div>
        </div>

        {/* Status row */}
        {statusContent}

        {/* Result feedback */}
        {result && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16,
            padding: '10px 12px', borderRadius: 8,
            background: result.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${result.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}>
            {result.ok
              ? <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 1 }} />
              : <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />}
            <span style={{ fontSize: 12, color: result.ok ? 'var(--success)' : 'var(--danger)' }}>
              {result.ok
                ? `Done — ${status?.summary || ''}`
                : result.msg}
            </span>
          </div>
        )}

        {/* Drop zone */}
        <div
          {...getRootProps()}
          style={{
            height: 120, borderRadius: 10, border: `2px dashed ${borderColor}`,
            background: bgColor, cursor: uploading ? 'default' : 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 8, transition: 'all 0.15s ease',
            opacity: uploading ? 0.7 : 1,
          }}
        >
          <input {...getInputProps()} />
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `${accent}15`, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            transform: isDragActive ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.15s ease',
          }}>
            <Upload size={16} style={{ color: accent }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            {isDragActive ? 'Drop to upload' : 'Drag & drop or click to browse'}
          </p>
        </div>

        {/* Progress */}
        {uploading && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>Processing…</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                style={{ height: '100%', background: accent, borderRadius: 2 }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        )}

        {/* Confirm modal */}
        {needsConfirm && (
          <ConfirmModal
            open={confirmOpen}
            title={`Upload ${title}`}
            message={confirmMsg}
            confirmLabel="Yes, Upload"
            danger
            onConfirm={() => { setConfirmOpen(false); doUpload(pendingFile) }}
            onCancel={() => { setConfirmOpen(false); setPendingFile(null) }}
          />
        )}
      </div>
    </>
  )
}

// ─── Status helpers ──────────────────────────────────────────────────────────

function StatusRow({ items, accent }) {
  if (!items?.length) return null
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 10, marginBottom: 16, padding: '12px 14px',
      borderRadius: 8, background: 'var(--bg-card-hover)',
      border: '1px solid var(--border)',
    }}>
      {items.map(({ label, value }) => (
        <div key={label}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 3 }}>
            {label}
          </p>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{value || '—'}</p>
        </div>
      ))}
    </div>
  )
}

function EmptyStatus({ accent, message }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
      padding: '10px 12px', borderRadius: 8,
      background: `${accent}0a`, border: `1px solid ${accent}25`,
      fontSize: 12, color: accent,
    }}>
      <Info size={13} />
      {message}
    </div>
  )
}

// ─── Column Mapping (collapsible) ────────────────────────────────────────────

function ColumnMappingSection() {
  const [mapping, setMapping] = useState(null)
  const [loadingMap, setLoadingMap] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    columnMappingAPI.get()
      .then((res) => { if (res.success) setMapping(res.data.mapping || {}) })
      .catch(() => {})
      .finally(() => setLoadingMap(false))
  }, [])

  const handleSave = async () => {
    try {
      await columnMappingAPI.save(draft)
      setMapping(draft)
      setEditing(false)
      toast.success('Column mapping saved')
    } catch {
      toast.error('Failed to save mapping')
    }
  }

  const displayMapping = editing ? draft : mapping

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '16px 20px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)',
        }}
      >
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, textAlign: 'left' }}>Column Mapping (Advanced)</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'left', marginTop: 2 }}>
            Auto-detected on upload · Override if incorrect
          </p>
        </div>
        {expanded
          ? <ChevronUp size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
          {loadingMap && <p style={{ fontSize: 13, color: 'var(--text-muted)', paddingTop: 16 }}>Loading…</p>}
          {!loadingMap && (!mapping || !Object.keys(mapping).length) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 14,
              padding: '10px 12px', borderRadius: 8, background: 'var(--accent-glow)',
              border: '1px solid var(--border)', fontSize: 13, color: 'var(--accent)',
            }}>
              <Info size={14} />
              No mapping saved yet. Upload a file to auto-detect.
            </div>
          )}
          {!loadingMap && mapping && Object.keys(mapping).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                  DETECTED MAPPING
                </p>
                {editing ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => { setEditing(false); setDraft({}) }}>Cancel</button>
                    <button className="btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={handleSave}>Save</button>
                  </div>
                ) : (
                  <button className="btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }}
                    onClick={() => { setEditing(true); setDraft({ ...mapping }) }}>Override</button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {Object.entries(displayMapping || {}).map(([field, col]) => (
                  <div key={field} style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
                  }}>
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {field}
                    </p>
                    {editing ? (
                      <input
                        value={draft[field] || ''}
                        onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                        style={{ width: '100%', padding: '3px 6px', fontSize: 12 }}
                      />
                    ) : (
                      <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>{col}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function DataManagement() {
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  // Delete modals
  const [deleteModal, setDeleteModal] = useState(null) // 'sales' | 'target' | 'footfall'
  const [deleting, setDeleting] = useState(false)
  const [deleteDailyModal, setDeleteDailyModal] = useState(false)
  const [deletingDaily, setDeletingDaily] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const res = await uploadAPI.getStatus()
      if (res.success) setStatus(res.data)
    } catch {}
    finally { setLoadingStatus(false) }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleDeleteDaily = async () => {
    setDeletingDaily(true)
    try {
      const res = await uploadAPI.resetDaily()
      if (res.success) {
        toast.success('Daily updates deleted successfully')
        loadStatus()
      } else {
        toast.error(res.error || 'Failed to delete daily updates')
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDeletingDaily(false)
      setDeleteDailyModal(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    setDeleting(true)
    try {
      if (deleteModal === 'sales') await uploadAPI.resetSales()
      if (deleteModal === 'target') await uploadAPI.resetTarget()
      if (deleteModal === 'footfall') await uploadAPI.resetFootfall()
      toast.success(`${deleteModal} data deleted`)
      loadStatus()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDeleting(false)
      setDeleteModal(null)
    }
  }

  const sales = status?.sales
  const target = status?.target
  const ff = status?.footfall

  return (
    <div style={{ padding: 24, width: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h2 style={{
          fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em',
          color: 'var(--text-primary)', marginBottom: 4,
        }}>
          Data Management
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
          Upload and manage sales, target, and footfall data
        </p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── 01 MASTER SALES DUMP ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <UploadCard
            number="01"
            title="MASTER SALES DUMP"
            subtitle="Upload the full historical sales file (YTD dump). This replaces all existing sales data."
            accent="#6366F1"
            needsConfirm
            confirmMsg="This will permanently delete all existing sales data and replace it with the new file. This cannot be undone."
            onUpload={(f, p) => uploadAPI.uploadDump(f, p).then((r) => { loadStatus(); return r })}
            statusContent={
              sales?.total_rows > 0
                ? <StatusRow accent="#6366F1" items={[
                    { label: 'TOTAL ROWS', value: sales.total_rows?.toLocaleString('en-IN') },
                    { label: 'LAST UPLOAD', value: sales.last_upload ? formatDateTimeDisplay(sales.last_upload.uploaded_at) : '—' },
                    { label: 'FILE', value: sales.last_upload?.file_name },
                    { label: 'DATE RANGE', value: sales.date_range?.start ? `${sales.date_range.start} — ${sales.date_range.end}` : '—' },
                  ]} />
                : <EmptyStatus accent="#6366F1" message="No sales data uploaded yet." />
            }
          />
        </motion.div>

        {/* ── 02 DAILY SALES UPDATE ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <UploadCard
            number="02"
            title="DAILY SALES UPDATE"
            subtitle="Upload today's new sales. Merges with existing data without deleting anything."
            accent="#10B981"
            onUpload={(f, p) => uploadAPI.uploadDaily(f, p).then((r) => { loadStatus(); return r })}
            statusContent={
              sales?.upload_log?.length
                ? (() => {
                    const daily = sales.upload_log.find((l) => l.file_type === 'daily')
                    return daily
                      ? <StatusRow accent="#10B981" items={[
                          { label: 'LAST DAILY FILE', value: daily.file_name },
                          { label: 'UPLOADED', value: formatDateTimeDisplay(daily.uploaded_at) },
                          { label: 'ROWS ADDED', value: daily.row_count?.toLocaleString('en-IN') },
                        ]} />
                      : <EmptyStatus accent="#10B981" message="No daily update uploaded yet." />
                  })()
                : <EmptyStatus accent="#10B981" message="No daily update uploaded yet." />
            }
          />
        </motion.div>

        {/* ── 03 MONTHLY TARGET ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <UploadCard
            number="03"
            title="MONTHLY TARGET"
            subtitle="Upload the monthly target file. Replaces target data for the months covered in the file."
            accent="#F59E0B"
            onUpload={(f, p) => uploadAPI.uploadTarget(f, p).then((r) => { loadStatus(); return r })}
            statusContent={
              target?.total_rows > 0
                ? <StatusRow accent="#F59E0B" items={[
                    { label: 'TOTAL ROWS', value: target.total_rows?.toLocaleString('en-IN') },
                    { label: 'LAST UPLOADED', value: target.last_uploaded ? formatDateTimeDisplay(target.last_uploaded) : '—' },
                    { label: 'MONTHS COVERED', value: target.months?.join(', ') },
                  ]} />
                : <EmptyStatus accent="#F59E0B" message="No target data uploaded yet." />
            }
          />
        </motion.div>

        {/* ── 04 FOOTFALL DATA ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <UploadCard
            number="04"
            title="FOOTFALL DATA"
            subtitle="Upload the footfall Excel file. Deduplicated automatically on import by branch + date."
            accent="#22D3EE"
            onUpload={(f, p) => uploadAPI.uploadFootfall(f, p).then((r) => { loadStatus(); return r })}
            statusContent={
              ff?.total_rows > 0
                ? <StatusRow accent="#22D3EE" items={[
                    { label: 'TOTAL ROWS', value: ff.total_rows?.toLocaleString('en-IN') },
                    { label: 'LAST UPLOADED', value: ff.last_uploaded ? formatDateTimeDisplay(ff.last_uploaded) : '—' },
                    { label: 'BRANCHES', value: ff.branches?.join(', ') },
                    { label: 'DATE RANGE', value: ff.date_range ? `${ff.date_range.start} — ${ff.date_range.end}` : '—' },
                  ]} />
                : <EmptyStatus accent="#22D3EE" message="No footfall data uploaded yet." />
            }
          />
        </motion.div>

        {/* ── COLUMN MAPPING (collapsed) ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <ColumnMappingSection />
        </motion.div>

        {/* ── DANGER ZONE ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="card" style={{ padding: 20, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <AlertTriangle size={15} style={{ color: 'var(--danger)' }} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)', letterSpacing: '0.06em' }}>
                DANGER ZONE
              </h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
              Permanently deletes all data for the selected category. These actions cannot be undone.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {/* Orange: less destructive — deletes only daily rows */}
              <button
                onClick={() => setDeleteDailyModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  border: '1px solid rgba(245,158,11,0.35)',
                  background: 'transparent', color: 'var(--warning)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <Trash2 size={13} />
                Delete Daily Updates Only
              </button>

              {/* Red: full deletes */}
              {[
                { key: 'sales', label: 'Delete All Sales Data', icon: Database },
                { key: 'target', label: 'Delete All Target Data', icon: Target },
                { key: 'footfall', label: 'Delete All Footfall Data', icon: UserCheck },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setDeleteModal(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    border: '1px solid rgba(239,68,68,0.3)',
                    background: 'transparent', color: 'var(--danger)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

      </div>

      {/* Daily delete confirm modal */}
      <AnimatePresence>
        {deleteDailyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.15 }}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 12,
                padding: 24,
                maxWidth: 420,
                width: '100%',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Delete Daily Updates Only
                </h3>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                This will delete all daily sales updates added after the master dump file.
                The original dump data will be kept intact. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  className="btn-ghost"
                  onClick={() => setDeleteDailyModal(false)}
                  disabled={deletingDaily}
                  style={{ opacity: deletingDaily ? 0.5 : 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDaily}
                  disabled={deletingDaily}
                  style={{
                    background: 'var(--warning)',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: deletingDaily ? 'not-allowed' : 'pointer',
                    border: 'none',
                    fontFamily: 'inherit',
                    opacity: deletingDaily ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Trash2 size={13} />
                  {deletingDaily ? 'Deleting…' : 'Delete Daily Updates'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <ConfirmModal
        open={!!deleteModal}
        title={`Delete All ${deleteModal ? deleteModal.charAt(0).toUpperCase() + deleteModal.slice(1) : ''} Data`}
        message={`This will permanently delete all ${deleteModal} data. This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete Everything'}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(null)}
      />
    </div>
  )
}
